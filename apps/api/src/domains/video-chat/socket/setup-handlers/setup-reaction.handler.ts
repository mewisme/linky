import type { ReactionPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";

export function setupReactionHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("reaction:triggered", (data: ReactionPayload) => {
    const reactionType = data.type || "heart";

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      return;
    }

    io.to(peerId).emit("reaction:triggered", {
      count: data.count,
      type: reactionType,
      timestamp: data.timestamp || Date.now(),
    });
  });
}
