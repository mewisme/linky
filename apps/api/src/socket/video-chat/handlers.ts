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
  logger.info("Client connected:", socket.id, "User:", userId);

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
      logger.error("No peer found for signal:", socket.id, "in room:", room.id, "Signal type:", signalType);
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
        logger.info("Notifying peer of end call:", peerId, "from", socket.id);
        io.to(peerId).emit("end-call", {
          message: "Call ended by peer",
        });
      } else {
        logger.warn("End call: Peer not found for user:", socket.id, "in room:", room.id);
      }

      rooms.deleteRoom(room.id);
      logger.info("Room cleaned up after end call:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
    } else {
      logger.info("End call: User not in room:", socket.id);
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
    logger.warn("Client disconnected:", socket.id, "Reason:", reason);

    userSessions.deactivateSession(userId, socket.id);

    const wasInQueue = matchmaking.isInQueue(socket.id);
    if (wasInQueue) {
      matchmaking.removeUser(socket.id);
      logger.info("User removed from queue on disconnect:", socket.id);
    }

    const room = rooms.getRoomByUser(socket.id);
    if (room) {
      const peerId = rooms.getPeer(socket.id);

      const peerSocket = peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined;
      recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        logger.info("Notifying peer of disconnect:", peerId, "from", socket.id);

        if (peerSocket) {
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
            logger.info("Peer re-queued after disconnect:", peerId, `(Queue size: ${peerQueueSize})`);
          } else {
            logger.warn("Disconnect: Failed to re-queue peer:", peerId);
            io.to(peerId).emit("peer-left", {
              message: "Peer disconnected",
            });
          }
        } else {
          logger.warn("Disconnect: Peer socket not found:", peerId);
        }
      } else {
        logger.warn("Disconnect: Peer not found for user:", socket.id, "in room:", room.id);
      }

      rooms.deleteRoom(room.id);
      logger.info("Room cleaned up after disconnect:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
    } else {
      logger.info("User disconnected (not in room or queue):", socket.id);
    }
  });
}
