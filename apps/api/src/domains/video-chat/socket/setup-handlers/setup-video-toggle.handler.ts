import type { VideoTogglePayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";

export function setupVideoToggleHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("video-toggle", (data: VideoTogglePayload) => {
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

    io.to(peerId).emit("video-toggle", {
      videoOff: data.videoOff,
    });
  });
}
