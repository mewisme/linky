import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { cleanupRateLimitState } from "../helpers/rate-limit.helper.js";

import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import { getDbUserId } from "../helpers/user.helper.js";
import { logger } from "../helpers/logger.helper.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

export function setupDisconnectHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("disconnect", async (reason: string) => {
    const isNamespaceDisconnect = reason === "client namespace disconnect" || reason === "server namespace disconnect";
    const wasInRoom = rooms.isInRoom(socket.id);
    const room = wasInRoom ? rooms.getRoomByUser(socket.id) : undefined;

    const dbUserId = await getDbUserId(socket);

    const shouldDequeueFromMatchmaking = !isNamespaceDisconnect || wasInRoom;

    if (dbUserId && shouldDequeueFromMatchmaking) {
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, `disconnect:${reason}`, io);
      logger.info(
        "Dequeued on disconnect: socket=%s user=%s reason=%s wasInRoom=%s",
        socket.id,
        userId,
        reason,
        wasInRoom,
      );
    } else if (dbUserId && isNamespaceDisconnect && !wasInRoom) {
      logger.info(
        "Skipped dequeue (transient namespace disconnect): socket=%s user=%s reason=%s",
        socket.id,
        userId,
        reason,
      );
    }

    if (room) {
      const peerId = rooms.getPeer(socket.id);
      const peerSocket = peerId ? (io.sockets.get(peerId) as AuthenticatedSocket | undefined) : undefined;

      recordCallHistory(io, room, socket, peerSocket).catch((error) => {
        logger.error(toLoggableError(error), "Failed to record call history");
      });

      if (peerId && peerSocket && peerSocket.connected) {
        io.to(peerId).emit("end-call", {
          message: "The other person lost connection. The call has ended.",
        });

        const peerDbUserId = await getDbUserId(peerSocket);
        if (peerDbUserId && dbUserId) {
          await matchmaking.recordSkip(dbUserId, peerDbUserId);
          await matchmaking.recordSkip(peerDbUserId, dbUserId);
        }

        if (peerDbUserId) {
          await matchmaking.dequeueIfOwner(peerDbUserId, peerSocket.id, "peer-disconnect", io);
        }
      }

      const callDurationMs = Date.now() - room.createdAt.getTime();
      rooms.deleteRoom(room.id);
      logger.info(
        "Call teardown: reason=disconnect:%s socket=%s durationMs=%d",
        reason,
        socket.id,
        callDurationMs,
      );
    }

    cleanupRateLimitState(socket);

    if (!wasInRoom) {
      logger.debug("Disconnect (no room): socket=%s user=%s reason=%s", socket.id, userId, reason);
    }
  });
}
