import type {
  ChatMessageInputPayload,
  FavoriteNotifyPeerPayload,
  MuteTogglePayload,
  ReactionPayload,
  ResyncSessionPayload,
  SignalPayload,
  VideoTogglePayload,
} from "../types/socket-event.types.js";
import type { VideoChatContext, VideoChatMatchmaking, VideoChatRooms, VideoChatUserSessions } from "./types.js";

import type { AuthenticatedSocket } from "../../../socket/auth.js";
import type { Namespace } from "socket.io";
import { createLogger } from "@repo/logger";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { isValidTimezone } from "../../../utils/timezone.js";
import { recordCallHistory } from "./call-history.socket.js";

const logger = createLogger("api:video-chat:socket:handlers");

async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }
  return await getUserIdByClerkId(clerkUserId);
}

export function setupSocketHandlers(socket: AuthenticatedSocket, context: VideoChatContext): void {
  const { io, matchmaking, rooms, userSessions } = context;
  const userId = socket.data.userId || "unknown";
  logger.info("Client connected: %s User: %s", socket.id, userId);

  socket.on("client:timezone:init", (payload: { timezone?: string }) => {
    const tz = typeof payload?.timezone === "string" ? payload.timezone.trim() : "";
    if (tz && isValidTimezone(tz)) {
      socket.data.timezone = tz;
      logger.info("Timezone set for socket %s: %s", socket.id, tz);
    }
  });

  matchmaking.cleanupStaleSockets(io).catch((error) => {
    logger.error("Failed to cleanup stale sockets: %o", error instanceof Error ? error : new Error(String(error)));
  });

  const sessionResult = userSessions.tryActivateSession(userId, socket);
  if (!sessionResult.activated) {
    socket.emit("session-waiting", {
      message: "Another session is active. Please wait...",
      positionInQueue: sessionResult.positionInQueue || 0,
      queueSize: userSessions.getQueueSize(userId),
    });
    logger.info("Session queued for user: %s socket: %s position: %d", userId, socket.id, sessionResult.positionInQueue || 0);
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
  setupVideoToggleHandler(socket, io, rooms);
  setupReactionHandler(socket, io, rooms);
  setupFavoriteNotificationHandler(socket, io, rooms);
  setupEndCallHandler(socket, checkActiveSession, io, matchmaking, rooms);
  setupResyncHandler(socket, userId, checkActiveSession, io, matchmaking, rooms);
  setupDisconnectHandler(socket, userId, io, matchmaking, rooms, userSessions);
}

function setupJoinHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("join", async () => {
    const userId = socket.data.userId || "unknown";
    logger.info("[JOIN] Join request received from socket: %s user: %s", socket.id, userId);

    if (!checkActiveSession()) {
      logger.warn("[JOIN] Session check failed for socket: %s", socket.id);
      return;
    }

    if (rooms.isInRoom(socket.id)) {
      logger.warn("[JOIN] User already in room, cannot join queue: %s Active rooms: %d", socket.id, rooms.getRoomCount());
      socket.emit("error", {
        message: "Already in a room. Please disconnect first.",
      });
      return;
    }

    logger.info("[JOIN] Calling matchmaking.enqueue for socket: %s", socket.id);
    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("[JOIN] Enqueue returned false for socket: %s", socket.id);
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

    logger.info(
      "[JOIN] User successfully joined queue: %s user: %s (Queue size: %d, Active rooms: %d)",
      socket.id,
      userId,
      queueSize,
      rooms.getRoomCount(),
    );
  });
}

function setupSkipHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("skip", async () => {
    logger.info("Skip request received from: %s", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (!dbUserId) {
      logger.warn("Skip: Cannot resolve dbUserId for socket: %s", socket.id);
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      if (peerId) {
        const peerSocket = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
        if (peerSocket) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            await matchmaking.recordSkip(dbUserId, peerDbUserId);
            await matchmaking.recordSkip(peerDbUserId, dbUserId);
          }
        }

        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up after skip: %s", socket.id);

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
              logger.info("Peer re-queued after skip: %s (Queue size: %d)", peerId, peerQueueSize);
            } else {
              logger.warn("Skip: Failed to re-queue peer: %s", peerId);
              io.to(peerId).emit("peer-left", {
                message: "Peer skipped",
              });
            }
          }
        } else {
          logger.warn("Skip: Peer socket not found: %s in room: %s", peerId, room.id);
        }
      } else {
        logger.warn("Skip: Peer not found for user: %s in room: %s", socket.id, room.id);
      }
    } else {
      logger.warn("Skip: User not in room: %s", socket.id);
    }

    const isInQueue = await matchmaking.isInQueue(dbUserId);
    if (isInQueue) {
      await matchmaking.removeUser(dbUserId);
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Skip: Failed to re-queue user: %s", socket.id);
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("skipped", {
      message: "Skipped. Looking for new match...",
      queueSize,
    });

    logger.info("User skipped and re-queued: %s (Queue size: %d)", socket.id, queueSize);
  });
}

function setupSignalHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("signal", (data: SignalPayload) => {
    const signalType = data.type || "unknown";
    logger.info("Signal received: %s from %s", signalType, socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Signal received from user not in room: %s Signal type: %s", socket.id, signalType);
      socket.emit("error", {
        message: "Not in a room. Cannot send signal.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for signal: %s in room: %s Signal type: %s", socket.id, room.id, signalType);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot relay signal", peerId);
      socket.emit("error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
    logger.info("Signal relayed: %s from %s to %s in room %s", signalType, socket.id, peerId, room.id);
  });
}

function setupChatMessageHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("chat-message", (data: ChatMessageInputPayload) => {
    logger.info("Chat message received from: %s", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Chat message received from user not in room: %s", socket.id);
      socket.emit("error", {
        message: "Not in a room. Cannot send chat message.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for chat message: %s in room: %s", socket.id, room.id);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot relay chat message", peerId);
      return;
    }

    io.to(peerId).emit("chat-message", {
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      senderId: socket.id,
      senderName: socket.data.userName || "Anonymous",
      senderImageUrl: socket.data.userImageUrl,
    });
    logger.info("Chat message relayed from %s to %s in room %s", socket.id, peerId, room.id);
  });
}

function setupMuteToggleHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("mute-toggle", (data: MuteTogglePayload) => {
    logger.info("Mute toggle received from: %s muted: %s", socket.id, data.muted);

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Mute toggle received from user not in room: %s", socket.id);
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for mute toggle: %s in room: %s", socket.id, room.id);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot relay mute toggle", peerId);
      return;
    }

    io.to(peerId).emit("mute-toggle", {
      muted: data.muted,
    });
    logger.info("Mute toggle relayed from %s to %s muted: %s", socket.id, peerId, data.muted);
  });
}

function setupVideoToggleHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("video-toggle", (data: VideoTogglePayload) => {
    logger.info("Video toggle received from: %s videoOff: %s", socket.id, data.videoOff);

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Video toggle received from user not in room: %s", socket.id);
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for video toggle: %s in room: %s", socket.id, room.id);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot relay video toggle", peerId);
      return;
    }

    io.to(peerId).emit("video-toggle", {
      videoOff: data.videoOff,
    });
    logger.info("Video toggle relayed from %s to %s videoOff: %s", socket.id, peerId, data.videoOff);
  });
}

function setupReactionHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("reaction:triggered", (data: ReactionPayload) => {
    const reactionType = data.type || "heart";
    logger.info("Reaction received from: %s count: %d type: %s", socket.id, data.count, reactionType);

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Reaction received from user not in room: %s", socket.id);
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for reaction: %s in room: %s", socket.id, room.id);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot relay reaction", peerId);
      return;
    }

    io.to(peerId).emit("reaction:triggered", {
      count: data.count,
      type: reactionType,
      timestamp: data.timestamp || Date.now(),
    });
    logger.info("Reaction relayed from %s to %s in room %s", socket.id, peerId, room.id);
  });
}

function setupFavoriteNotificationHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("favorite:notify-peer", (data: FavoriteNotifyPeerPayload) => {
    logger.info("Favorite notification request received from: %s action: %s", socket.id, data.action);

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      logger.warn("Favorite notification from user not in room: %s", socket.id);
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      logger.error("No peer found for favorite notification: %s in room: %s", socket.id, room.id);
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cannot send favorite notification", peerId);
      return;
    }

    const eventName = data.action === "added" ? "favorite:added" : "favorite:removed";
    io.to(peerId).emit(eventName, {
      from_user_id: data.peer_user_id,
      from_user_name: data.user_name,
    });
    logger.info("Favorite notification relayed: %s from %s to %s", eventName, socket.id, peerId);
  });
}

function setupEndCallHandler(
  socket: AuthenticatedSocket,
  checkActiveSession: () => boolean,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("end-call", async () => {
    logger.info("End call request received from: %s", socket.id);

    if (!checkActiveSession()) {
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
        logger.info("User removed from queue on end call: %s", socket.id);
      }
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      recordCallHistory(
        io,
        room,
        socket,
        peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined,
      ).catch((error) => {
        logger.error("Failed to record call history: %s", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        logger.info("Notifying peer of end call: %s from %s", peerId, socket.id);
        const peerSocket = io.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        } else {
          logger.warn("Peer socket not found or disconnected: %s - cannot send end-call", peerId);
        }
      } else {
        logger.warn("Peer not found for user: %s in room: %s", socket.id, room.id);
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info(
        "Room cleaned up after end call: %s (Active rooms: %d, Queue size: %d)",
        socket.id,
        rooms.getRoomCount(),
        queueSize,
      );
    } else {
      logger.info("End call: User not in room: %s", socket.id);
    }
  });
}

function setupResyncHandler(
  socket: AuthenticatedSocket,
  userId: string,
  checkActiveSession: () => boolean,
  io: Namespace,
  _matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", async (data: ResyncSessionPayload) => {
    logger.info("Resync request received from: %s User: %s Timestamp: %d", socket.id, userId, data.timestamp || 0);

    if (!checkActiveSession()) {
      logger.warn("Session not active, ignoring resync request");
      return;
    }

    const existingRoom = rooms.getRoomByUser(socket.id);
    if (existingRoom) {
      logger.info("Socket already in room: %s", existingRoom.id);
      return;
    }

    const roomWithUserId = rooms.findRoomByUserId(userId, io);
    if (!roomWithUserId) {
      logger.info("No active room found for user: %s", userId);
      socket.emit("error", {
        message: "No active room to resync. Please start a new call.",
      });
      return;
    }

    const oldSocketId = roomWithUserId.user1;
    const peerOldSocketId = roomWithUserId.user2;

    const user1Socket = io.sockets.get(oldSocketId) as AuthenticatedSocket | undefined;
    const isUser1 = user1Socket?.data.userId === userId;

    const socketIdToReplace = isUser1 ? oldSocketId : peerOldSocketId;
    const peerSocketId = isUser1 ? peerOldSocketId : oldSocketId;

    if (socketIdToReplace === socket.id) {
      logger.info("Socket ID matches, no update needed");
      return;
    }

    logger.info("Re-binding socket: %s to room: %s replacing: %s", socket.id, roomWithUserId.id, socketIdToReplace);

    const peerSocket = io.sockets.get(peerSocketId) as AuthenticatedSocket | undefined;
    if (!peerSocket || !peerSocket.connected) {
      logger.warn("Peer socket not found or disconnected: %s - cleaning up orphaned room", peerSocketId);
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

    logger.info("Successfully re-bound socket to room: %s", roomWithUserId.id);

    const peerId = rooms.getPeer(socket.id);
    if (peerId) {
      const _peerSocketFinal = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
      const isOfferer =
        roomWithUserId.user1 === socket.id
          ? roomWithUserId.user1 < roomWithUserId.user2
          : roomWithUserId.user2 < roomWithUserId.user1;

      socket.emit("matched", {
        roomId: roomWithUserId.id,
        peerId,
        isOfferer,
        peerInfo: null,
        myInfo: null,
      });
      logger.info("Sent matched event to reconnected socket: %s peer: %s", socket.id, peerId);
    }
  });
}

function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
  userSessions: VideoChatUserSessions,
): void {
  socket.on("disconnect", async (reason: string) => {
    logger.warn("Client disconnected: %s User: %s Reason: %s", socket.id, userId, reason);

    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    userSessions.deactivateSession(userId, socket.id);

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasInQueue = await matchmaking.isInQueue(dbUserId);
      if (wasInQueue) {
        await matchmaking.removeUser(dbUserId);
        logger.info("User removed from queue on disconnect: %s", socket.id);
      }
    }

    if (room) {
      const peerId = rooms.getPeer(socket.id);
      const peerSocket = peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined;

      recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error("Failed to record call history: %s", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId && peerSocket && peerSocket.connected) {
        logger.info("Notifying peer of end-call due to disconnect: %s from %s", peerId, socket.id);
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
            const stillConnected = peerSocket.connected && io.sockets.get(peerId);
            if (stillConnected) {
              const peerAdded = await matchmaking.enqueue(peerSocket);
              if (peerAdded) {
                const peerQueueSize = await matchmaking.getQueueSize();
                logger.info("Peer re-queued after disconnect cooldown: %s (Queue size: %d)", peerId, peerQueueSize);
              }
            }
          }, 5000);
        }
      } else if (peerId) {
        logger.warn("Peer socket not found or disconnected: %s", peerId);
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info(
        "Room cleaned up immediately after disconnect: %s (Active rooms: %d, Queue size: %d)",
        socket.id,
        rooms.getRoomCount(),
        queueSize,
      );
    } else {
      logger.info("User disconnected (not in room or queue): %s", socket.id);
    }
  });
}

