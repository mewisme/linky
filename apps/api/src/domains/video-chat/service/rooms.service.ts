import type { Namespace } from "socket.io";
import type { VideoChatRoomRecord } from "@/domains/video-chat/types/room.types.js";
import { createLogger } from "@repo/logger";

export class RoomService {
  private rooms: Map<string, VideoChatRoomRecord> = new Map();
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private readonly logger = createLogger("api:video-chat:rooms:service");

  createRoom(user1SocketId: string, user2SocketId: string): string {
    const roomId = `room_${user1SocketId}_${user2SocketId}_${Date.now()}`;

    const room: VideoChatRoomRecord = {
      id: roomId,
      user1: user1SocketId,
      user2: user2SocketId,
      createdAt: new Date(),
      startedAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(user1SocketId, roomId);
    this.userToRoom.set(user2SocketId, roomId);

    this.logger.debug("Room created: %s", roomId);

    return roomId;
  }

  getRoom(roomId: string): VideoChatRoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUser(socketId: string): VideoChatRoomRecord | undefined {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) {
      return undefined;
    }
    return this.rooms.get(roomId);
  }

  getPeer(socketId: string): string | null {
    const room = this.getRoomByUser(socketId);
    if (!room) {
      return null;
    }

    const peerId = room.user1 === socketId ? room.user2 : room.user1;
    return peerId;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const roomAge = Date.now() - room.createdAt.getTime();
    this.userToRoom.delete(room.user1);
    this.userToRoom.delete(room.user2);
    this.rooms.delete(roomId);

    this.logger.debug(
      "Room deleted: %s age=%ds active=%d",
      roomId,
      Math.round(roomAge / 1000),
      this.rooms.size,
    );
  }

  deleteRoomByUser(socketId: string): VideoChatRoomRecord | null {
    const room = this.getRoomByUser(socketId);
    if (!room) {
      return null;
    }

    this.deleteRoom(room.id);
    return room;
  }

  isInRoom(socketId: string): boolean {
    return this.userToRoom.has(socketId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  updateSocketId(oldSocketId: string, newSocketId: string): boolean {
    const roomId = this.userToRoom.get(oldSocketId);
    if (!roomId) {
      return false;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.userToRoom.delete(oldSocketId);
      return false;
    }

    if (room.user1 === oldSocketId) {
      room.user1 = newSocketId;
    } else if (room.user2 === oldSocketId) {
      room.user2 = newSocketId;
    } else {
      return false;
    }

    this.userToRoom.delete(oldSocketId);
    this.userToRoom.set(newSocketId, roomId);

    return true;
  }

  findRoomByUserId(userId: string, io: Namespace): VideoChatRoomRecord | null {
    for (const room of this.rooms.values()) {
      const user1Socket = io.sockets.get(room.user1);
      const user2Socket = io.sockets.get(room.user2);
      if (user1Socket && (user1Socket as any).data?.userId === userId) {
        return room;
      }
      if (user2Socket && (user2Socket as any).data?.userId === userId) {
        return room;
      }
    }
    return null;
  }

  getAllRooms(): VideoChatRoomRecord[] {
    return Array.from(this.rooms.values());
  }
}

