import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { recordCallHistory, recordCallHistoryFromRoom } from "@/domains/video-chat/socket/call-history.socket.js";
import { type AuthenticatedSocket } from "@/socket/auth.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:video-chat:end-call-unload:route");
const unloadRateLimit = createRateLimitMiddleware({ windowMs: 10_000, maxRequests: 5 });

router.post("/end-call-unload", unloadRateLimit, async (req: Request, res: Response) => {
  try {
    const { socketId } = req.body;
    const callerClerkId = req.auth?.sub;

    if (!socketId || typeof socketId !== "string") {
      logger.warn("Invalid request: missing or invalid socketId");
      return sendJsonError(res, 400, "Bad Request", um("SOCKET_ID_REQUIRED", "socketIdRequired", "socketId is required"));
    }

    if (!callerClerkId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        toUserMessage("API_UNAUTHORIZED", { key: "api.missingAuth" }, "Missing authentication"),
      );
    }

    const context = getVideoChatContext();
    if (!context) {
      logger.error("Video chat context not available");
      return sendJsonError(
        res,
        503,
        "Service unavailable",
        um("VIDEO_CHAT_UNAVAILABLE", "serviceUnavailable", "Service unavailable"),
      );
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
            logger.error(toLoggableError(error), "Failed to record call history from room");
          });
        }
        const peerId = rooms.getPeer(socketId);
        if (peerId) {
          const peerSocket = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
          if (peerSocket && peerSocket.connected) {
            io.to(peerId).emit("end-call", {
              ...userFacingPayload(
                toUserMessage(
                  "END_PEER_LEFT_PAGE",
                  { key: "call.end.peerLeftPage" },
                  "The other person left the page. The call has ended.",
                ),
              ),
            });
            logger.info("Notified peer of end-call: %s", peerId);
          }
        }
        rooms.deleteRoom(room.id);
        logger.info("Room cleaned up for disconnected socket: %s", socketId);
      }
      return sendJsonWithUserMessage(
        res,
        200,
        { success: true },
        toUserMessage("API_CLEANUP_OK", { key: "api.cleanupCompleted" }, "Cleanup completed"),
      );
    }

    const clerkUserId = socket.data.userId;

    if (clerkUserId !== callerClerkId) {
      logger.warn(
        "Ownership mismatch: caller=%s socket owner=%s socketId=%s",
        callerClerkId,
        clerkUserId,
        socketId,
      );
      return sendJsonError(
        res,
        403,
        "Forbidden",
        toUserMessage("API_SOCKET_FORBIDDEN", { key: "api.socketForbidden" }, "Socket does not belong to caller"),
      );
    }
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
        logger.error(toLoggableError(error), "Failed to record call history");
      });

      if (peerId) {
        logger.info("Notifying peer of end-call: %s from %s", peerId, socketId);
        const peerSocketFinal = io.sockets.get(peerId);
        if (peerSocketFinal && peerSocketFinal.connected) {
          io.to(peerId).emit("end-call", {
            ...userFacingPayload(
              toUserMessage(
                "END_PEER_LEFT_PAGE",
                { key: "call.end.peerLeftPage" },
                "The other person left the page. The call has ended.",
              ),
            ),
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

    sendJsonWithUserMessage(
      res,
      200,
      { success: true },
      toUserMessage("API_END_CALL_OK", { key: "api.endCallProcessed" }, "End-call processed"),
    );
  } catch (error) {
    logger.error(toLoggableError(error), "Error processing unload end-call");
    sendJsonError(
      res,
      500,
      "Internal server error",
      um("END_CALL_INTERNAL", "internalServerError", "Internal server error"),
    );
  }
});

export default router;

