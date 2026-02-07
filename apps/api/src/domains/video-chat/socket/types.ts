import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { ChatMessageSnapshot } from "@/domains/video-chat/types/chat-message.types.js";
import type { Namespace } from "socket.io";
import type { VideoChatRoom } from "@/domains/video-chat/types/room.types.js";

export interface VideoChatMatchmaking {
  enqueue(socket: unknown): Promise<boolean>;
  tryMatch(io: Namespace): Promise<Array<{ socketId: string; socket: unknown; joinedAt: Date }> | null>;
  getQueueSize(): Promise<number>;
  isInQueue(userId: string): Promise<boolean>;
  isQueueOwner(userId: string, socketId: string): Promise<boolean>;
  dequeueIfOwner(userId: string, socketId: string, reason?: string): Promise<boolean>;
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
  addChatSnapshot(roomId: string, message: ChatMessageSnapshot): void;
  getChatSnapshot(roomId: string): ChatMessageSnapshot[];
}

export interface VideoChatContext {
  io: Namespace;
  matchmaking: VideoChatMatchmaking;
  rooms: VideoChatRooms;
}

