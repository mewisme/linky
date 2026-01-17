import { type Server as SocketIOServer } from "socket.io";
import { RedisMatchmakingService } from "../../services/redis-matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { UserSessionService } from "../../services/user-sessions.js";
import { Logger } from "../../utils/logger.js";
import { type AuthenticatedSocket } from "../auth.js";
import { recordCallHistory } from "./call-history.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";

const logger = new Logger("VideoChatHandlers");
import type { VideoChatContext } from "./types.js";

async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }
  return await getUserIdByClerkId(clerkUserId);
}

export function setupSocketHandlers(
  socket: AuthenticatedSocket,
  context: VideoChatContext
): void {
  const { io, matchmaking, rooms, userSessions } = context;
  const userId = socket.data.userId || "unknown";
  logger.info("Client connected:", socket.id, "User:", userId);

  matchmaking.cleanupStaleSockets(io).catch((error) => {
    logger.error("Failed to cleanup stale sockets:", error instanceof Error ? error.message : "Unknown error");
  });

  const sessionResult = userSessions.tryActivateSession(userId, socket);
  if (!sessionResult.activated) {
    socket.emit("session-waiting", {
      message: "Another session is active. Please wait...",
      positionInQueue: sessionResult.positionInQueue || 0,
      queueSize: userSessions.getQueueSize(userId),
    });
    logger.info("Session queued for user:", userId, "socket:", socket.id, "position:", sessionResult.positionInQueue);
  } else {
    socket.emit("session-activated", {
      message: "Your session is now active. You can proceed.",
    });
  }

  const checkActiveSession = (): boolean => {
    if (!userSessions.isActiveSession(userId, socket.id)) {
      socket.emit("error", {
        message: "Session is not active. Please wait for your turn.",
      });
      return false;
    }
    return true;
  };

  setupJoinHandler(socket, checkActiveSession, matchmaking, rooms);
  setupSkipHandler(socket, checkActiveSession, io, matchmaking, rooms);
  setupSignalHandler(socket, checkActiveSession, io, rooms);
  setupChatMessageHandler(socket, checkActiveSession, io, rooms);
  setupMuteToggleHandler(socket, io, rooms);
  setupEndCallHandler(socket, checkActiveSession, io, matchmaking, rooms);
  setupResyncHandler(socket, userId, checkActiveSession, io, matchmaking, rooms);
  setupDisconnectHandler(socket, userId, io, matchmaking, rooms, userSessions);
}

function setupJoinHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService
): void {
  socket.on("join", async () => {
    logger.info("Join request received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    if (rooms.isInRoom(socket.id)) {
      logger.warn("User already in room, cannot join queue:", socket.id, "Active rooms:", rooms.getRoomCount());
      socket.emit("error", {
        message: "Already in a room. Please disconnect first.",
      });
      return;
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("User already in queue, duplicate join request:", socket.id);
      socket.emit("error", {
        message: "Already in queue.",
      });
      return;
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("joined-queue", {
      message: "Waiting for a match...",
      queueSize,
    });

    logger.info("User successfully joined queue:", socket.id, `(Queue size: ${queueSize}, Active rooms: ${rooms.getRoomCount()})`);
  });
}

function setupSkipHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService
): void {
  socket.on("skip", async () => {
    logger.info("Skip request received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (!dbUserId) {
      logger.warn("Skip: Cannot resolve dbUserId for socket:", socket.id);
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      if (peerId) {
        const peerSocket = io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined;
        if (peerSocket) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            await matchmaking.recordSkip(dbUserId, peerDbUserId);
            await matchmaking.recordSkip(peerDbUserId, dbUserId);
          }
        }

        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up after skip:", socket.id);

        if (peerSocket) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            const isPeerInQueue = await matchmaking.isInQueue(peerDbUserId);
            if (isPeerInQueue) {
              await matchmaking.removeUser(peerDbUserId);
            }

            const peerAdded = await matchmaking.enqueue(peerSocket);
            if (peerAdded) {
              const peerQueueSize = await matchmaking.getQueueSize();
              io.to(peerId).emit("peer-skipped", {
                message: "Peer skipped. Re-entering queue for next match...",
                queueSize: peerQueueSize,
              });
              logger.info("Peer re-queued after skip:", peerId, `(Queue size: ${peerQueueSize})`);
            } else {
              logger.warn("Skip: Failed to re-queue peer:", peerId);
              io.to(peerId).emit("peer-left", {
                message: "Peer skipped",
              });
            }
          }
        } else {
          logger.warn("Skip: Peer socket not found:", peerId);
        }
      } else {
        logger.warn("Skip: Peer not found for user:", socket.id, "in room:", room.id);
      }
    } else {
      logger.warn("Skip: User not in room:", socket.id);
    }

    const isInQueue = await matchmaking.isInQueue(dbUserId);
    if (isInQueue) {
      await matchmaking.removeUser(dbUserId);
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Skip: Failed to re-queue user:", socket.id);
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("skipped", {
      message: "Skipped. Looking for new match...",
      queueSize,
    });

    logger.info("User skipped and re-queued:", socket.id, `(Queue size: ${queueSize})`);
  });
}

function setupSignalHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  rooms: RoomService
): void {
  socket.on("signal", (data: { type: string; sdp?: unknown; candidate?: unknown }) => {
    const signalType = data.type || "unknown";
    logger.info("Signal received:", signalType, "from", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Signal received from user not in room:", socket.id, "Signal type:", signalType);
      socket.emit("error", {
        message: "Not in a room. Cannot send signal.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for signal:", socket.id, "in room:", room.id, "Signal type:", signalType);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected:", peerId, "- cannot relay signal");
      socket.emit("error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
    logger.info("Signal relayed:", signalType, "from", socket.id, "to", peerId, "in room", room.id);
  });
}

function setupChatMessageHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  rooms: RoomService
): void {
  socket.on("chat-message", (data: { message: string; timestamp?: number }) => {
    logger.info("Chat message received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Chat message received from user not in room:", socket.id);
      socket.emit("error", {
        message: "Not in a room. Cannot send chat message.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for chat message:", socket.id, "in room:", room.id);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected:", peerId, "- cannot relay chat message");
      return;
    }

    io.to(peerId).emit("chat-message", {
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      senderId: socket.id,
      senderName: socket.data.userName || "Anonymous",
      senderImageUrl: socket.data.userImageUrl,
    });
    logger.info("Chat message relayed from", socket.id, "to", peerId, "in room", room.id);
  });
}

function setupMuteToggleHandler(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  rooms: RoomService
): void {
  socket.on("mute-toggle", (data: { muted: boolean }) => {
    logger.info("Mute toggle received from:", socket.id, "muted:", data.muted);

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Mute toggle received from user not in room:", socket.id);
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for mute toggle:", socket.id, "in room:", room.id);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected:", peerId, "- cannot relay mute toggle");
      return;
    }

    io.to(peerId).emit("mute-toggle", {
      muted: data.muted,
    });
    logger.info("Mute toggle relayed from", socket.id, "to", peerId, "muted:", data.muted);
  });
}

function setupEndCallHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService
): void {
  socket.on("end-call", async () => {
    logger.info("End call request received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
        logger.info("User removed from queue on end call:", socket.id);
      }
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      recordCallHistory(io, room, socket, peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined).catch((error) => {
        logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        logger.info("Notifying peer of end call:", peerId, "from", socket.id);
        const peerSocket = io.sockets.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        } else {
          logger.warn("Peer socket not found or disconnected:", peerId, "- cannot send end-call");
        }
      } else {
        logger.warn("Peer not found for user:", socket.id, "in room:", room.id);
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info("Room cleaned up after end call:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${queueSize})`);
    } else {
      logger.info("End call: User not in room:", socket.id);
    }
  });
}

function setupResyncHandler(
  socket: AuthenticatedSocket,
  userId: string,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", async (data: { timestamp?: number }) => {
    logger.info("Resync request received from:", socket.id, "User:", userId, "Timestamp:", data.timestamp);

    if (!checkActiveSession()) {
      logger.warn("Session not active, ignoring resync request");
      return;
    }

    const existingRoom = rooms.getRoomByUser(socket.id);
    if (existingRoom) {
      logger.info("Socket already in room:", existingRoom.id);
      return;
    }

    const roomWithUserId = rooms.findRoomByUserId(userId, io);
    if (!roomWithUserId) {
      logger.info("No active room found for user:", userId);
      socket.emit("error", {
        message: "No active room to resync. Please start a new call.",
      });
      return;
    }

    const oldSocketId = roomWithUserId.user1;
    const peerOldSocketId = roomWithUserId.user2;

    const user1Socket = io.sockets.sockets.get(oldSocketId) as AuthenticatedSocket | undefined;
    const isUser1 = user1Socket?.data.userId === userId;

    const socketIdToReplace = isUser1 ? oldSocketId : peerOldSocketId;
    const peerSocketId = isUser1 ? peerOldSocketId : oldSocketId;

    if (socketIdToReplace === socket.id) {
      logger.info("Socket ID matches, no update needed");
      return;
    }

    logger.info("Re-binding socket:", socket.id, "to room:", roomWithUserId.id, "replacing:", socketIdToReplace);

    const peerSocket = io.sockets.sockets.get(peerSocketId) as AuthenticatedSocket | undefined;
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected:", peerSocketId, "- cleaning up orphaned room");
      rooms.deleteRoom(roomWithUserId.id);
      socket.emit("peer-left", {
        message: "Peer disconnected. Room cleaned up.",
      });
      return;
    }

    const updated = rooms.updateSocketId(socketIdToReplace, socket.id);
    if (!updated) {
      logger.error("Failed to update socket ID in room");
      return;
    }

    logger.info("Successfully re-bound socket to room:", roomWithUserId.id);

    const peerId = rooms.getPeer(socket.id);
    if (peerId) {
      const peerSocketFinal = io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined;
      const isOfferer = roomWithUserId.user1 === socket.id ? (roomWithUserId.user1 < roomWithUserId.user2) : (roomWithUserId.user2 < roomWithUserId.user1);

      socket.emit("matched", {
        roomId: roomWithUserId.id,
        peerId,
        isOfferer,
        peerInfo: null,
        myInfo: null,
      });
      logger.info("Sent matched event to reconnected socket:", socket.id, "peer:", peerId);
    }
  });
}

function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: SocketIOServer,
  matchmaking: RedisMatchmakingService,
  rooms: RoomService,
  userSessions: UserSessionService
): void {
  socket.on("disconnect", async (reason: string) => {
    logger.warn("Client disconnected:", socket.id, "User:", userId, "Reason:", reason);

    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    userSessions.deactivateSession(userId, socket.id);

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
        logger.info("User removed from queue on disconnect:", socket.id);
      }
    }

    if (room) {
      const peerId = rooms.getPeer(socket.id);
      const peerSocket = peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined;

      recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId && peerSocket && peerSocket.connected) {
        logger.info("Notifying peer of end-call due to disconnect:", peerId, "from", socket.id);
        io.to(peerId).emit("end-call", {
          message: "Call ended - peer disconnected",
        });

        const peerDbUserId = await getDbUserId(peerSocket);
        if (peerDbUserId && dbUserId) {
          await matchmaking.recordSkip(dbUserId, peerDbUserId);
          await matchmaking.recordSkip(peerDbUserId, dbUserId);
        }

        if (peerDbUserId) {
          const isPeerInQueue = await matchmaking.isInQueue(peerDbUserId);
          if (isPeerInQueue) {
            await matchmaking.removeUser(peerDbUserId);
          }

          setTimeout(async () => {
            const stillConnected = peerSocket.connected && io.sockets.sockets.get(peerId);
            if (stillConnected) {
              const peerAdded = await matchmaking.enqueue(peerSocket);
              if (peerAdded) {
                const peerQueueSize = await matchmaking.getQueueSize();
                logger.info("Peer re-queued after disconnect cooldown:", peerId, `(Queue size: ${peerQueueSize})`);
              }
            }
          }, 5000);
        }
      } else if (peerId) {
        logger.warn("Peer socket not found or disconnected:", peerId);
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info("Room cleaned up immediately after disconnect:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${queueSize})`);
    } else {
      logger.info("User disconnected (not in room or queue):", socket.id);
    }
  });
}
