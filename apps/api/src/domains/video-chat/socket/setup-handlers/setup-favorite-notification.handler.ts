import type { FavoriteNotifyPeerPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";

export function setupFavoriteNotificationHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("favorite:notify-peer", (data: FavoriteNotifyPeerPayload) => {
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

    const eventName = data.action === "added" ? "favorite:added" : "favorite:removed";
    io.to(peerId).emit(eventName, {
      from_user_id: data.peer_user_id,
      from_user_name: data.user_name,
    });
  });
}
