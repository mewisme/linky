import type { Socket } from "socket.io";

export interface QueueEntry {
  userId: string;
  socketId: string;
  joinedAt: number;
}

export interface MatchStateStore {
  enqueueUser(userId: string, socketId: string, socket: Socket): Promise<boolean>;
  dequeueUser(userId: string, reason?: string): Promise<boolean>;
  getQueuedUsers(limit?: number): Promise<QueueEntry[]>;
  getUserSocketId(userId: string): Promise<string | null>;
  setUserSocketId(userId: string, socketId: string, socket: Socket): Promise<void>;
  removeUserSocket(userId: string): Promise<void>;
  recordSkip(skipperUserId: string, skippedUserId: string): Promise<void>;
  hasSkip(userAId: string, userBId: string): Promise<boolean>;
  getQueueSize(): Promise<number>;
  isInQueue(userId: string): Promise<boolean>;
  cacheUserData(userId: string): Promise<void>;
  getUserInterests(userId: string): Promise<string[]>;
  getUserFavorites(userId: string): Promise<string[]>;
  getUserBlocks(userId: string): Promise<string[]>;
  cleanup(): Promise<void>;
}
