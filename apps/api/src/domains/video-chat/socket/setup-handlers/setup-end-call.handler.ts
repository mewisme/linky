import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";
import { logger } from "../helpers/logger.helper.js";
import { getDbUserId } from "../helpers/user.helper.js";

export function setupEndCallHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("end-call", async () => {
    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, "end-call");
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
        const peerSocket = io.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "Call ended by peer",
          });
        }
      }

      rooms.deleteRoom(room.id);
      logger.debug("Call ended by user: %s", socket.id);
    }
  });
}
