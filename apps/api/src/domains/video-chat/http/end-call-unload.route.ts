import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";
import { createLogger } from "@/utils/logger.js";
import { recordCallHistory, recordCallHistoryFromRoom } from "@/domains/video-chat/socket/call-history.socket.js";
import { type AuthenticatedSocket } from "@/socket/auth.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:video-chat:end-call-unload:route");

router.post("/end-call-unload", async (req: Request, res: Response) => {
  try {
    const { socketId } = req.body;

    if (!socketId || typeof socketId !== "string") {
      logger.warn("Invalid request: missing or invalid socketId");
      return res.status(400).json({ error: "socketId is required" });
    }

    const context = getVideoChatContext();
    if (!context) {
      logger.error("Video chat context not available");
      return res.status(503).json({ error: "Service unavailable" });
    }

    const { io, matchmaking, rooms } = context;

    logger.info("Unload-triggered end-call received for socket: %s", socketId);

    const socket = io.sockets.get(socketId) as AuthenticatedSocket | undefined;

    if (!socket) {
      logger.warn("Socket not found: %s - may have already disconnected", socketId);
      const room = rooms.getRoomByUser(socketId);
      if (room) {
        if (room.user1DbId && room.user2DbId) {
          await recordCallHistoryFromRoom(io, room).catch((error) => {
            logger.error(error as Error, "Failed to record call history from room");
          });
        }
        const peerId = rooms.getPeer(socketId);
        if (peerId) {
          const peerSocket = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
          if (peerSocket && peerSocket.connected) {
            io.to(peerId).emit("end-call", {
              message: "Call ended by peer (unload)",
            });
            logger.info("Notified peer of end-call: %s", peerId);
          }
        }
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up for disconnected socket: %s", socketId);
      }
      return res.status(200).json({ success: true, message: "Cleanup completed" });
    }

    const clerkUserId = socket.data.userId;
    if (clerkUserId) {
      const dbUserId = await getUserIdByClerkId(clerkUserId);
      if (dbUserId) {
        const wasInQueue = await matchmaking.isInQueue(dbUserId);
        if (wasInQueue) {
          await matchmaking.removeUser(dbUserId);
          logger.info("User removed from queue: %s", socketId);
        }
      }
    }

    const room = rooms.getRoomByUser(socketId);
    if (room) {
      const peerId = rooms.getPeer(socketId);

      const peerSocket = peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined;
      await recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error(error as Error, "Failed to record call history");
      });

      if (peerId) {
        logger.info("Notifying peer of end-call: %s from %s", peerId, socketId);
        const peerSocketFinal = io.sockets.get(peerId);
        if (peerSocketFinal && peerSocketFinal.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer (unload)",
          });
        } else {
          logger.warn("Peer socket not found or disconnected: %s", peerId);
        }
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info(
        "Room cleaned up after unload end-call: %s (Active rooms: %d, Queue size: %d)",
        socketId,
        rooms.getRoomCount(),
        queueSize,
      );
    } else {
      logger.info("Socket not in room: %s", socketId);
    }

    res.status(200).json({ success: true, message: "End-call processed" });
  } catch (error) {
    logger.error(error as Error, "Error processing unload end-call");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

