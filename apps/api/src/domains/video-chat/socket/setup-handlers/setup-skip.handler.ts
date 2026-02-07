import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { logger } from "../helpers/logger.helper.js";
import { getDbUserId } from "../helpers/user.helper.js";

export function setupSkipHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("skip", async () => {
    const dbUserId = await getDbUserId(socket);
    if (!dbUserId) {
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

        if (peerSocket && peerSocket.connected) {
          const peerDbUserId = await getDbUserId(peerSocket);
          if (peerDbUserId) {
            const peerAdded = await matchmaking.enqueue(peerSocket);
            if (peerAdded) {
              const peerQueueSize = await matchmaking.getQueueSize();
              io.to(peerId).emit("peer-skipped", {
                message: "Peer skipped. Re-entering queue for next match...",
                queueSize: peerQueueSize,
              });
            } else {
              io.to(peerId).emit("peer-left", {
                message: "Peer skipped",
              });
            }
          }
        }
      }
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      logger.warn("Failed to re-queue user after skip: socket=%s userId=%s", socket.id, dbUserId);
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("skipped", {
      message: "Skipped. Looking for new match...",
      queueSize,
    });
  });
}
