import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";

import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import { getDbUserId } from "../helpers/user.helper.js";
import { logger } from "../helpers/logger.helper.js";
import { recordCallHistory } from "@/domains/video-chat/socket/call-history.socket.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

export function setupEndCallHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("end-call", async () => {
    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      await matchmaking.dequeueIfOwner(dbUserId, socket.id, "end-call", io);
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
        logger.error(toLoggableError(error), "Failed to record call history");
      });

      if (peerId) {
        const peerSocket = io.sockets.get(peerId);
        if (peerSocket && peerSocket.connected) {
          io.to(peerId).emit("end-call", {
            message: "The other person ended the call.",
          });
        }
      }

      const callDurationMs = Date.now() - room.createdAt.getTime();
      rooms.deleteRoom(room.id);
      logger.info(
        "Call teardown: reason=user_ended socket=%s durationMs=%d",
        socket.id,
        callDurationMs,
      );
    }
  });
}
