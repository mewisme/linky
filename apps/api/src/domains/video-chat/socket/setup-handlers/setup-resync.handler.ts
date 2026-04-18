import type { ResyncSessionPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { logger } from "../helpers/logger.helper.js";

export function setupResyncHandler(
  socket: AuthenticatedSocket,
  userId: string,
  io: Namespace,
  _matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("resync-room-state", () => {
    socket.emit("resync-session", { timestamp: Date.now() });
  });

  socket.on("resync-session", async (data: ResyncSessionPayload) => {
    const existingRoom = rooms.getRoomByUser(socket.id);
    if (existingRoom) {
      return;
    }

    const roomWithUserId = rooms.findRoomByUserId(userId, io);
    if (!roomWithUserId) {
      socket.emit("video-chat:error", {
        message: "No active room to resync. Please start a new call.",
      });
      return;
    }

    const oldSocketId = roomWithUserId.user1;
    const peerOldSocketId = roomWithUserId.user2;

    const user1Socket = io.sockets.get(oldSocketId) as AuthenticatedSocket | undefined;
    const isUser1 = user1Socket?.data.userId === userId;

    const socketIdToReplace = isUser1 ? oldSocketId : peerOldSocketId;
    const peerSocketId = isUser1 ? peerOldSocketId : oldSocketId;

    if (socketIdToReplace === socket.id) {
      return;
    }

    const peerSocket = io.sockets.get(peerSocketId) as AuthenticatedSocket | undefined;
    if (!peerSocket || !peerSocket.connected) {
      rooms.deleteRoom(roomWithUserId.id);
      socket.emit("peer-left", {
        message: "The other person is offline. The call has ended.",
      });
      return;
    }

    const updated = rooms.updateSocketId(socketIdToReplace, socket.id);
    if (!updated) {
      logger.error("Failed to update socket ID in room");
      return;
    }

    logger.info("Session resynced: user=%s room=%s", userId, roomWithUserId.id);

    const peerId = rooms.getPeer(socket.id);
    if (peerId) {
      const _peerSocketFinal = io.sockets.get(peerId) as AuthenticatedSocket | undefined;
      const isOfferer =
        roomWithUserId.user1 === socket.id
          ? roomWithUserId.user1 < roomWithUserId.user2
          : roomWithUserId.user2 < roomWithUserId.user1;

      socket.emit("matched", {
        roomId: roomWithUserId.id,
        peerId,
        isOfferer,
        peerInfo: null,
        myInfo: null,
      });
    }
  });
}
