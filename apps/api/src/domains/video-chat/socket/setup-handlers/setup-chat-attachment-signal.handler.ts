import type { ChatAttachmentSignalPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";

export function setupChatAttachmentSignalHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("chat:attachment:signal", (data: ChatAttachmentSignalPayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("chat:error", { message: "Not in a room. Cannot send attachment signal." });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      socket.emit("chat:error", { message: "Peer disconnected. Cannot send attachment signal." });
      return;
    }

    io.to(peerId).emit("chat:attachment:signal", data);
  });
}
