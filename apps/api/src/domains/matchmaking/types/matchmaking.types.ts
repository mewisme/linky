import type { Socket } from "socket.io";

export interface QueuedUser {
  socketId: string;
  socket: Socket;
  joinedAt: Date;
}

export interface SkipRecord {
  timestamp: number;
}

