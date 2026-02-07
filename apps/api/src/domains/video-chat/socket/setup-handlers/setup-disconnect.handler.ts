import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";
import { logger } from "../helpers/logger.helper.js";
import { getDbUserId } from "../helpers/user.helper.js";
import { messageRateState, attachmentRateState } from "../helpers/rate-limit.helper.js";

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
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, `disconnect:${reason}`);
      logger.debug(
        "Dequeued on disconnect: socket=%s user=%s reason=%s wasInRoom=%s",
        socket.id,
        userId,
        reason,
        wasInRoom,
      );
    } else if (dbUserId && isNamespaceDisconnect && !wasInRoom) {
      logger.debug(
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
        logger.error("Failed to record call history: %s", error instanceof Error ? error.message : "Unknown error");
      });

      if (peerId && peerSocket && peerSocket.connected) {
        io.to(peerId).emit("end-call", {
          message: "Call ended - peer disconnected",
        });

        const peerDbUserId = await getDbUserId(peerSocket);
        if (peerDbUserId && dbUserId) {
          await matchmaking.recordSkip(dbUserId, peerDbUserId);
          await matchmaking.recordSkip(peerDbUserId, dbUserId);
        }

        if (peerDbUserId) {
          await matchmaking.dequeueIfOwner(peerDbUserId, peerSocket.id, "peer-disconnect");
        }
      }

      rooms.deleteRoom(room.id);
    }

    messageRateState.delete(socket.id);
    attachmentRateState.delete(socket.id);

    if (isNamespaceDisconnect && !wasInRoom) {
      logger.debug("Namespace disconnect (queued): socket=%s user=%s reason=%s dequeued=%s", socket.id, userId, reason, false);
    } else if (isNamespaceDisconnect && wasInRoom) {
      logger.debug("Namespace disconnect (in-room): socket=%s user=%s reason=%s dequeued=%s", socket.id, userId, reason, true);
    } else {
      logger.info("Client disconnected: socket=%s user=%s reason=%s wasInRoom=%s dequeued=%s", socket.id, userId, reason, wasInRoom, shouldDequeueFromMatchmaking);
    }
  });
}
