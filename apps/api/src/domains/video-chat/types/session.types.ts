import type { Socket } from "socket.io";

export interface WaitingSession {
  socketId: string;
  socket: Socket;
  joinedAt: Date;
}

