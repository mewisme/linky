import type { Namespace } from "socket.io";
import type { AuthenticatedSocket } from "../../../socket/auth.js";
import type { VideoChatRoom } from "../types/room.types.js";

export interface VideoChatMatchmaking {
  enqueue(socket: AuthenticatedSocket): Promise<boolean>;
  tryMatch(io: Namespace): Promise<Array<{ socketId: string; socket: unknown }> | null>;
  getQueueSize(): Promise<number>;
  isInQueue(userId: string): Promise<boolean>;
  removeUser(userId: string): Promise<void>;
  recordSkip(userId: string, skippedUserId: string): Promise<void>;
  cleanupStaleSockets(io: Namespace): Promise<void>;
  cleanupExpiredEntries(io: Namespace): Promise<void>;
}

export interface VideoChatRooms {
  getRoom(roomId: string): (VideoChatRoom & { id: string; createdAt: Date }) | undefined;
  getRoomByUser(socketId: string): (VideoChatRoom & { id: string; createdAt: Date }) | undefined;
  findRoomByUserId(userId: string, io: Namespace): (VideoChatRoom & { id: string; createdAt: Date }) | null;
  getPeer(socketId: string): string | null;
  updateSocketId(oldSocketId: string, newSocketId: string): boolean;
  deleteRoom(roomId: string): void;
  isInRoom(socketId: string): boolean;
  getRoomCount(): number;
  getAllRooms(): Array<VideoChatRoom & { id: string; createdAt: Date }>;
  createRoom(user1SocketId: string, user2SocketId: string): string;
}

export interface VideoChatUserSessions {
  tryActivateSession(userId: string, socket: unknown): { activated: boolean; positionInQueue?: number };
  isActiveSession(userId: string, socketId: string): boolean;
  getQueueSize(userId: string): number;
  deactivateSession(userId: string, socketId: string): void;
}

export interface VideoChatContext {
  io: Namespace;
  matchmaking: VideoChatMatchmaking;
  rooms: VideoChatRooms;
  userSessions: VideoChatUserSessions;
}

