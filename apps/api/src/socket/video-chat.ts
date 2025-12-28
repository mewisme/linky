import { type Server as SocketIOServer } from "socket.io";
import { MatchmakingService } from "../services/matchmaking.js";
import { RoomService } from "../services/rooms.js";
import { UserSessionService } from "../services/user-sessions.js";
import { logger } from "../utils/logger.js";
import { type AuthenticatedSocket } from "./auth.js";

/**
 * Setup Socket.IO handlers for video chat signaling and matchmaking
 */
export function setupVideoChatHandlers(
  io: SocketIOServer,
  matchmaking: MatchmakingService,
  rooms: RoomService,
  userSessions: UserSessionService
): void {
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId || "unknown";
    logger.info("Client connected:", socket.id, "User:", userId);

    // Try to activate session for this user
    const sessionResult = userSessions.tryActivateSession(userId, socket);
    if (!sessionResult.activated) {
      // Session is queued, notify client
      socket.emit("session-waiting", {
        message: "Another session is active. Please wait...",
        positionInQueue: sessionResult.positionInQueue || 0,
        queueSize: userSessions.getQueueSize(userId),
      });
      logger.info("Session queued for user:", userId, "socket:", socket.id, "position:", sessionResult.positionInQueue);
    }

    // Helper function to check if session is active
    const checkActiveSession = (): boolean => {
      if (!userSessions.isActiveSession(userId, socket.id)) {
        socket.emit("error", {
          message: "Session is not active. Please wait for your turn.",
        });
        return false;
      }
      return true;
    };

    /**
     * User joins the matchmaking queue
     */
    socket.on("join", () => {
      logger.info("Join request received from:", socket.id);

      // Check if this is the active session
      if (!checkActiveSession()) {
        return;
      }

      // Check if user is already in a room
      if (rooms.isInRoom(socket.id)) {
        logger.warn("User already in room, cannot join queue:", socket.id, "Active rooms:", rooms.getRoomCount());
        socket.emit("error", {
          message: "Already in a room. Please disconnect first.",
        });
        return;
      }

      // Add to matchmaking queue
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

    /**
     * User skips current peer and re-enters queue
     */
    socket.on("skip", () => {
      logger.info("Skip request received from:", socket.id);

      // Check if this is the active session
      if (!checkActiveSession()) {
        return;
      }

      const room = rooms.getRoomByUser(socket.id);
      if (room) {
        const peerId = rooms.getPeer(socket.id);

        // Notify peer that user skipped and they should re-enter queue
        if (peerId) {
          logger.info("Notifying peer of skip:", peerId, "from", socket.id);

          // Record the skip for cooldown tracking
          matchmaking.recordSkip(socket.id, peerId);

          // Get peer socket to check if they're still connected
          const peerSocket = io.sockets.sockets.get(peerId);
          if (peerSocket) {
            // Remove peer from queue if they're in it
            if (matchmaking.isInQueue(peerId)) {
              matchmaking.removeUser(peerId);
            }

            // Re-enter peer into queue
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

        // Clean up room
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up after skip:", socket.id);
      } else {
        logger.warn("Skip: User not in room:", socket.id);
      }

      // Re-enter queue
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

    /**
     * Handle WebRTC signaling messages
     * Relay SDP offers, answers, and ICE candidates between peers
     */
    socket.on("signal", (data: { type: string; sdp?: unknown; candidate?: unknown }) => {
      const signalType = data.type || "unknown";
      logger.info("Signal received:", signalType, "from", socket.id);

      // Check if this is the active session
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

      // Relay signal to peer
      io.to(peerId).emit("signal", data);
      logger.info("Signal relayed:", signalType, "from", socket.id, "to", peerId, "in room", room.id);
    });

    /**
     * Handle chat messages
     * Relay messages between matched users in the same room
     */
    socket.on("chat-message", (data: { message: string; timestamp?: number }) => {
      logger.info("Chat message received from:", socket.id);

      // Check if this is the active session
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

      // Relay message to peer with sender's profile info
      io.to(peerId).emit("chat-message", {
        message: data.message,
        timestamp: data.timestamp || Date.now(),
        senderId: socket.id,
        senderName: socket.data.userName || "Anonymous",
        senderImageUrl: socket.data.userImageUrl,
      });
      logger.info("Chat message relayed from", socket.id, "to", peerId, "in room", room.id);
    });

    /**
     * Handle mute toggle
     * Relay mute state between matched users in the same room
     */
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

      // Relay mute state to peer
      io.to(peerId).emit("mute-toggle", {
        muted: data.muted,
      });
      logger.info("Mute toggle relayed from", socket.id, "to", peerId, "muted:", data.muted);
    });

    /**
     * Handle end call
     * Notify peer and clean up room
     */
    socket.on("end-call", () => {
      logger.info("End call request received from:", socket.id);

      // Check if this is the active session
      if (!checkActiveSession()) {
        return;
      }

      // Remove from queue if present
      const wasInQueue = matchmaking.isInQueue(socket.id);
      if (wasInQueue) {
        matchmaking.removeUser(socket.id);
        logger.info("User removed from queue on end call:", socket.id);
      }

      // Handle room cleanup
      const room = rooms.getRoomByUser(socket.id);
      if (room) {
        const peerId = rooms.getPeer(socket.id);

        // Notify peer that call ended
        if (peerId) {
          logger.info("Notifying peer of end call:", peerId, "from", socket.id);
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        } else {
          logger.warn("End call: Peer not found for user:", socket.id, "in room:", room.id);
        }

        // Clean up room
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up after end call:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
      } else {
        logger.info("End call: User not in room:", socket.id);
      }
    });

    /**
     * Handle user disconnect
     */
    socket.on("disconnect", (reason: string) => {
      logger.warn("Client disconnected:", socket.id, "Reason:", reason);

      // Deactivate session and activate next in queue
      userSessions.deactivateSession(userId, socket.id);

      // Remove from queue if present
      const wasInQueue = matchmaking.isInQueue(socket.id);
      if (wasInQueue) {
        matchmaking.removeUser(socket.id);
        logger.info("User removed from queue on disconnect:", socket.id);
      }

      // Handle room cleanup
      const room = rooms.getRoomByUser(socket.id);
      if (room) {
        const peerId = rooms.getPeer(socket.id);

        // Notify peer
        if (peerId) {
          logger.info("Notifying peer of disconnect:", peerId, "from", socket.id);
          io.to(peerId).emit("peer-left", {
            message: "Peer disconnected",
          });
        } else {
          logger.warn("Disconnect: Peer not found for user:", socket.id, "in room:", room.id);
        }

        // Clean up room
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up after disconnect:", socket.id, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${matchmaking.getQueueSize()})`);
      } else {
        logger.info("User disconnected (not in room or queue):", socket.id);
      }
    });
  });

  // Periodically try to match users in the queue
  setInterval(() => {
    const queueSize = matchmaking.getQueueSize();
    if (queueSize >= 2) {
      logger.load(`Matching users (queue: ${queueSize})...`);
      const matched = matchmaking.tryMatch();
      if (matched && matched.length === 2) {
        const [user1, user2] = matched;

        if (!user1 || !user2) {
          logger.error("Match failed: Invalid user data");
          return;
        }

        // Create room
        const roomId = rooms.createRoom(user1.socketId, user2.socketId);

        // Determine offerer (user with lower socket ID) and answerer
        // This ensures only one peer creates the offer
        const isUser1Offerer = user1.socketId < user2.socketId;

        // Notify both users with role information
        user1.socket.emit("matched", {
          roomId,
          peerId: user2.socketId,
          isOfferer: isUser1Offerer,
        });

        user2.socket.emit("matched", {
          roomId,
          peerId: user1.socketId,
          isOfferer: !isUser1Offerer,
        });

        logger.done("Users matched:", user1.socketId, "and", user2.socketId, `(Active rooms: ${rooms.getRoomCount()}, Remaining queue: ${matchmaking.getQueueSize()})`);
      }
    }
  }, 1000); // Check every second
}

