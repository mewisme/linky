import { type Socket } from "socket.io";
import { logger } from "../utils/logger.js";

interface Room {
  id: string;
  user1: string; // socketId
  user2: string; // socketId
  createdAt: Date;
}

/**
 * Room management service for matched pairs
 */
export class RoomService {
  private rooms: Map<string, Room> = new Map();
  private userToRoom: Map<string, string> = new Map(); // socketId -> roomId

  /**
   * Create a room for two matched users
   */
  createRoom(user1SocketId: string, user2SocketId: string): string {
    const roomId = `room_${user1SocketId}_${user2SocketId}_${Date.now()}`;

    const room: Room = {
      id: roomId,
      user1: user1SocketId,
      user2: user2SocketId,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(user1SocketId, roomId);
    this.userToRoom.set(user2SocketId, roomId);

    logger.info("Room created:", roomId, "for users:", user1SocketId, user2SocketId);

    return roomId;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn("Room not found:", roomId);
    }
    return room;
  }

  /**
   * Get room for a user
   */
  getRoomByUser(socketId: string): Room | undefined {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) {
      return undefined;
    }
    return this.rooms.get(roomId);
  }

  /**
   * Get the peer socket ID for a user in a room
   */
  getPeer(socketId: string): string | null {
    const room = this.getRoomByUser(socketId);
    if (!room) {
      logger.warn("Peer lookup failed: User not in room:", socketId);
      return null;
    }

    const peerId = room.user1 === socketId ? room.user2 : room.user1;
    logger.info("Peer lookup:", socketId, "->", peerId, "in room", room.id);
    return peerId;
  }

  /**
   * Delete a room and clean up mappings
   */
  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn("Attempted to delete non-existent room:", roomId);
      return;
    }

    const roomAge = Date.now() - room.createdAt.getTime();
    this.userToRoom.delete(room.user1);
    this.userToRoom.delete(room.user2);
    this.rooms.delete(roomId);

    logger.info("Room deleted:", roomId, `(Users: ${room.user1}, ${room.user2}, Age: ${Math.round(roomAge / 1000)}s, Active rooms: ${this.rooms.size})`);
  }

  /**
   * Delete room by user socket ID
   */
  deleteRoomByUser(socketId: string): Room | null {
    const room = this.getRoomByUser(socketId);
    if (!room) {
      return null;
    }

    this.deleteRoom(room.id);
    return room;
  }

  /**
   * Check if a user is in a room
   */
  isInRoom(socketId: string): boolean {
    return this.userToRoom.has(socketId);
  }

  /**
   * Get total number of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size;
  }
}

