import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { getVideoChatContext } from "../../socket/video-chat/context.js";
import { Logger } from "../../utils/logger.js";
import { recordCallHistory } from "../../socket/video-chat/call-history.js";
import { type AuthenticatedSocket } from "../../socket/auth.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";

const router: ExpressRouter = Router();
const logger = new Logger("UnloadEndCallRoute");

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

    logger.info("Unload-triggered end-call received for socket:", socketId);

    const socket = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;

    if (!socket) {
      logger.warn("Socket not found:", socketId, "- may have already disconnected");
      const room = rooms.getRoomByUser(socketId);
      if (room) {
        const peerId = rooms.getPeer(socketId);
        if (peerId) {
          const peerSocket = io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined;
          if (peerSocket && peerSocket.connected) {
            io.to(peerId).emit("end-call", {
              message: "Call ended by peer (unload)",
            });
            logger.info("Notified peer of end-call:", peerId);
          }
        }
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up for disconnected socket:", socketId);
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
          logger.info("User removed from queue:", socketId);
        }
      }
    }

    const room = rooms.getRoomByUser(socketId);
    if (room) {
      const peerId = rooms.getPeer(socketId);

      const peerSocket = peerId ? io.sockets.sockets.get(peerId) as AuthenticatedSocket | undefined : undefined;
      await recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error("Failed to record call history:", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId) {
        logger.info("Notifying peer of end-call:", peerId, "from", socketId);
        const peerSocketFinal = io.sockets.sockets.get(peerId);
        if (peerSocketFinal && peerSocketFinal.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer (unload)",
          });
        } else {
          logger.warn("Peer socket not found or disconnected:", peerId);
        }
      }

      rooms.deleteRoom(room.id);
      const queueSize = await matchmaking.getQueueSize();
      logger.info("Room cleaned up after unload end-call:", socketId, `(Active rooms: ${rooms.getRoomCount()}, Queue size: ${queueSize})`);
    } else {
      logger.info("Socket not in room:", socketId);
    }

    res.status(200).json({ success: true, message: "End-call processed" });
  } catch (error) {
    logger.error("Error processing unload end-call:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
