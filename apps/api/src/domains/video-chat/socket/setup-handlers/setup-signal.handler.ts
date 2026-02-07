import type { SignalPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";

export function setupSignalHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("signal", (data: SignalPayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("error", {
        message: "Not in a room. Cannot send signal.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      socket.emit("error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
  });
}
