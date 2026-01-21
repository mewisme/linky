import type { Namespace } from "socket.io";
import type { VideoChatRoomRecord } from "../types/room.types.js";
import { createLogger } from "@repo/logger/api";

export class RoomService {
  private rooms: Map<string, VideoChatRoomRecord> = new Map();
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private readonly logger = createLogger("API:VideoChat:Rooms:Service");

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

    this.logger.info("Room created: %s for users: %s %s", roomId, user1SocketId, user2SocketId);

    return roomId;
  }

  getRoom(roomId: string): VideoChatRoomRecord | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn("Room not found: %s", roomId);
    }
    return room;
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
      this.logger.warn("Peer lookup failed: User not in room: %s", socketId);
      return null;
    }

    const peerId = room.user1 === socketId ? room.user2 : room.user1;
    this.logger.info("Peer lookup: %s -> %s in room %s", socketId, peerId, room.id);
    return peerId;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn("Attempted to delete non-existent room: %s", roomId);
      return;
    }

    const roomAge = Date.now() - room.createdAt.getTime();
    this.userToRoom.delete(room.user1);
    this.userToRoom.delete(room.user2);
    this.rooms.delete(roomId);

    this.logger.info(
      "Room deleted: %s (Users: %s, %s, Age: %ds, Active rooms: %d)",
      roomId,
      room.user1,
      room.user2,
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

    this.logger.info("Updated socket ID: %s -> %s in room: %s", oldSocketId, newSocketId, roomId);
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

