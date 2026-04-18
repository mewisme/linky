import type { ScreenShareTogglePayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";
import { sendPeerActionPush } from "@/contexts/peer-action-notification-context.js";
import { getDbUserId } from "../helpers/user.helper.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";

export function setupScreenShareHandler(socket: AuthenticatedSocket, io: Namespace, rooms: VideoChatRooms): void {
  socket.on("screen-share:toggle", async (data: ScreenShareTogglePayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit(
        "video-chat:error",
        userFacingPayload(
          toUserMessage("SCREEN_NOT_IN_ROOM", { key: "call.screenShare.notInRoom" }, "Not in a room."),
        ),
      );
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

    io.to(peerId).emit("screen-share:toggle", {
      sharing: data.sharing,
      streamId: data.streamId,
    });

    if (data.sharing) {
      const peerDbUserId = await getDbUserId(peerSocket as AuthenticatedSocket);
      if (peerDbUserId) {
        void sendPeerActionPush({
          userId: peerDbUserId,
          peerSocket: peerSocket as AuthenticatedSocket,
          title: "Screen sharing started",
          body: `${socket.data.userName || "Anonymous"} started sharing their screen`,
          url: "/call",
        });
      }
    }
  });
}
