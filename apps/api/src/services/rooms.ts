import type { Namespace } from "socket.io";
import { Logger } from "../utils/logger.js";

interface Room {
  id: string;
  user1: string; // socketId
  user2: string; // socketId
  createdAt: Date;
  startedAt: Date; // When the call actually started (after match)
}

export class RoomService {
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId
  private readonly logger = new Logger("RoomService");

  createRoom(user1SocketId: string, user2SocketId: string): string {
    const roomId = `room_${user1SocketId}_${user2SocketId}_${Date.now()}`;

    const room: Room = {
      id: roomId,
      user1: user1SocketId,
      user2: user2SocketId,
      createdAt: new Date(),
      startedAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(user1SocketId, roomId);
    this.userToRoom.set(user2SocketId, roomId);

    this.logger.info("Room created:", roomId, "for users:", user1SocketId, user2SocketId);

    return roomId;
  }

  getRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn("Room not found:", roomId);
    }
    return room;
  }

  getRoomByUser(socketId: string): Room | undefined {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) {
      return undefined;
    }
    return this.rooms.get(roomId);
  }

  getPeer(socketId: string): string | null {
    const room = this.getRoomByUser(socketId);
    if (!room) {
      this.logger.warn("Peer lookup failed: User not in room:", socketId);
      return null;
    }

    const peerId = room.user1 === socketId ? room.user2 : room.user1;
    this.logger.info("Peer lookup:", socketId, "->", peerId, "in room", room.id);
    return peerId;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.logger.warn("Attempted to delete non-existent room:", roomId);
      return;
    }

    const roomAge = Date.now() - room.createdAt.getTime();
    this.userToRoom.delete(room.user1);
    this.userToRoom.delete(room.user2);
    this.rooms.delete(roomId);

    this.logger.info("Room deleted:", roomId, `(Users: ${room.user1}, ${room.user2}, Age: ${Math.round(roomAge / 1000)}s, Active rooms: ${this.rooms.size})`);
  }

  deleteRoomByUser(socketId: string): Room | null {
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

    this.logger.info("Updated socket ID:", oldSocketId, "->", newSocketId, "in room:", roomId);
    return true;
  }

  findRoomByUserId(userId: string, io: Namespace): Room | null {
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

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

