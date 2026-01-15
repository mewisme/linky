import { type Server as SocketIOServer } from "socket.io";
import { MatchmakingService } from "../../services/matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { UserSessionService } from "../../services/user-sessions.js";
import { logger } from "../../utils/logger.js";
import { type AuthenticatedSocket } from "../auth.js";
import { recordCallHistory } from "./call-history.js";
import type { VideoChatContext } from "./types.js";

export function setupSocketHandlers(
  socket: AuthenticatedSocket,
  context: VideoChatContext
): void {
  const { io, matchmaking, rooms, userSessions } = context;
  const userId = socket.data.userId || "unknown";
  logger.info("[SocketLifecycle] Client connected:", socket.id, "User:", userId);

  matchmaking.cleanupStaleSockets(io);

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
  matchmaking: MatchmakingService,
  rooms: RoomService
): void {
  socket.on("join", () => {
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

    const added = matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("User already in queue, duplicate join request:", socket.id);
      socket.emit("error", {
        message: "Already in queue.",
      });
      return;
    }

    const queueSize = matchmaking.getQueueSize();
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
  matchmaking: MatchmakingService,
  rooms: RoomService
): void {
  socket.on("skip", () => {
    logger.info("Skip request received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      if (peerId) {
        logger.info("Notifying peer of skip:", peerId, "from", socket.id);

        matchmaking.recordSkip(socket.id, peerId);

        const peerSocket = io.sockets.sockets.get(peerId);
        if (peerSocket) {
          if (matchmaking.isInQueue(peerId)) {
            matchmaking.removeUser(peerId);
          }

          const peerAdded = matchmaking.enqueue(peerSocket);
          if (peerAdded) {
            const peerQueueSize = matchmaking.getQueueSize();
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
        } else {
          logger.warn("Skip: Peer socket not found:", peerId);
        }
      } else {
        logger.warn("Skip: Peer not found for user:", socket.id, "in room:", room.id);
      }

      rooms.deleteRoom(room.id);
      logger.info("Room cleaned up after skip:", socket.id);
    } else {
      logger.warn("Skip: User not in room:", socket.id);
    }

    const added = matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Skip: Failed to re-queue user:", socket.id);
    }

    const queueSize = matchmaking.getQueueSize();
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
      logger.error("[SignalRouting] No peer found for signal:", socket.id, "in room:", room.id, "Signal type:", signalType);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("[SignalRouting] Peer socket not found or disconnected:", peerId, "- cannot relay signal");
      socket.emit("error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
    logger.info("[SignalRouting] Signal relayed:", signalType, "from", socket.id, "to", peerId, "in room", room.id);
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
      logger.error("[SignalRouting] No peer found for chat message:", socket.id, "in room:", room.id);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("[SignalRouting] Peer socket not found or disconnected:", peerId, "- cannot relay chat message");
      return;
    }

    io.to(peerId).emit("chat-message", {
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      senderId: socket.id,
      senderName: socket.data.userName || "Anonymous",
      senderImageUrl: socket.data.userImageUrl,
    });
    logger.info("[SignalRouting] Chat message relayed from", socket.id, "to", peerId, "in room", room.id);
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
      logger.error("[SignalRouting] No peer found for mute toggle:", socket.id, "in room:", room.id);
      return;
    }

    const peerSocket = io.sockets.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("[SignalRouting] Peer socket not found or disconnected:", peerId, "- cannot relay mute toggle");
      return;
    }

    io.to(peerId).emit("mute-toggle", {
      muted: data.muted,
    });
    logger.info("[SignalRouting] Mute toggle relayed from", socket.id, "to", peerId, "muted:", data.muted);
  });
}

function setupEndCallHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: SocketIOServer,
  matchmaking: MatchmakingService,
  rooms: RoomService
): void {
  socket.on("end-call", () => {
    logger.info("End call request received from:", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const wasInQueue = matchmaking.isInQueue(socket.id);
    if (wasInQueue) {
      matchmaking.removeUser(socket.id);
      logger.info("User removed from queue on end call:", socket.id);
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      recordCallHistory(io, room, socket, peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined).catch((error) => {
        logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        logger.info("[SignalRouting] Notifying peer of end call:", peerId, "from", socket.id);
        const peerSocket = io.sockets.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        } else {
          logger.warn("[SignalRouting] Peer socket not found or disconnected:", peerId, "- cannot send end-call");
        }
      } else {
        logger.warn("[SignalRouting] Peer not found for user:", socket.id, "in room:", room.id);
      }

      rooms.deleteRoom(room.id);
      logger.info("Room cleaned up after end call:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
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
  matchmaking: MatchmakingService,
  rooms: RoomService
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", (data: { timestamp?: number }) => {
    logger.info("[SocketResync] Resync request received from:", socket.id, "User:", userId, "Timestamp:", data.timestamp);

    if (!checkActiveSession()) {
      logger.warn("[SocketResync] Session not active, ignoring resync request");
      return;
    }

    const existingRoom = rooms.getRoomByUser(socket.id);
    if (existingRoom) {
      logger.info("[SocketResync] Socket already in room:", existingRoom.id);
      return;
    }

    const roomWithUserId = rooms.findRoomByUserId(userId, io);
    if (!roomWithUserId) {
      logger.info("[SocketResync] No active room found for user:", userId);
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
      logger.info("[SocketResync] Socket ID matches, no update needed");
      return;
    }

    logger.info("[SocketResync] Re-binding socket:", socket.id, "to room:", roomWithUserId.id, "replacing:", socketIdToReplace);

    const peerSocket = io.sockets.sockets.get(peerSocketId) as AuthenticatedSocket | undefined;
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("[SocketResync] Peer socket not found or disconnected:", peerSocketId, "- cleaning up orphaned room");
      rooms.deleteRoom(roomWithUserId.id);
      socket.emit("peer-left", {
        message: "Peer disconnected. Room cleaned up.",
      });
      return;
    }

    const updated = rooms.updateSocketId(socketIdToReplace, socket.id);
    if (!updated) {
      logger.error("[SocketResync] Failed to update socket ID in room");
      return;
    }

    logger.info("[SocketResync] Successfully re-bound socket to room:", roomWithUserId.id);

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
      logger.info("[SocketResync] Sent matched event to reconnected socket:", socket.id, "peer:", peerId);
    }
  });
}

function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: SocketIOServer,
  matchmaking: MatchmakingService,
  rooms: RoomService,
  userSessions: UserSessionService
): void {
  socket.on("disconnect", (reason: string) => {
    logger.warn("[SocketLifecycle] Client disconnected:", socket.id, "User:", userId, "Reason:", reason);

    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    userSessions.deactivateSession(userId, socket.id);

    const wasInQueue = matchmaking.isInQueue(socket.id);
    if (wasInQueue) {
      matchmaking.removeUser(socket.id);
      logger.info("[SocketLifecycle] User removed from queue on disconnect:", socket.id);
    }

    if (room) {
      const peerId = rooms.getPeer(socket.id);

      const peerSocket = peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined;

      if (peerSocket && peerSocket.connected) {
        logger.info("[SocketLifecycle] Peer still connected, deferring room cleanup for potential reconnect");
        recordCallHistory(io, room, socket, peerSocket).catch((error) => {
          logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
        });

        setTimeout(() => {
          const stillInRoom = rooms.getRoomByUser(socket.id);
          const peerStillConnected = peerId ? io.sockets.sockets.get(peerId)?.connected : false;

          if (stillInRoom && !peerStillConnected) {
            logger.warn("[SocketLifecycle] Peer did not reconnect, cleaning up room:", room.id);
            rooms.deleteRoom(room.id);
          } else if (stillInRoom && peerStillConnected) {
            logger.info("[SocketLifecycle] Room still active, peer may have reconnected");
          }
        }, 5000);
      } else {
        recordCallHistory(io, room, socket, peerSocket).catch((error) => {
          logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
        });

        if (peerId) {
          logger.info("[SocketLifecycle] Notifying peer of disconnect:", peerId, "from", socket.id);

          if (peerSocket && peerSocket.connected) {
            if (matchmaking.isInQueue(peerId)) {
              matchmaking.removeUser(peerId);
            }

            const peerAdded = matchmaking.enqueue(peerSocket);
            if (peerAdded) {
              const peerQueueSize = matchmaking.getQueueSize();
              io.to(peerId).emit("peer-left", {
                message: "Peer disconnected. Re-entering queue for next match...",
                queueSize: peerQueueSize,
              });
              logger.info("[SocketLifecycle] Peer re-queued after disconnect:", peerId, `(Queue size: ${peerQueueSize})`);
            } else {
              logger.warn("[SocketLifecycle] Failed to re-queue peer:", peerId);
              io.to(peerId).emit("peer-left", {
                message: "Peer disconnected",
              });
            }
          } else {
            logger.warn("[SocketLifecycle] Peer socket not found or disconnected:", peerId);
          }
        } else {
          logger.warn("[SocketLifecycle] Peer not found for user:", socket.id, "in room:", room.id);
        }

        rooms.deleteRoom(room.id);
        logger.info("[SocketLifecycle] Room cleaned up after disconnect:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
      }
    } else {
      logger.info("[SocketLifecycle] User disconnected (not in room or queue):", socket.id);
    }
  });
}
