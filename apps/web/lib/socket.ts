import { Socket, io } from "socket.io-client";

import { logger } from "@/utils/logger";

export async function createSocket(token?: string | null): Promise<Socket> {
  return io(process.env.NEXT_PUBLIC_API_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token,
    },
    query: {
      token,
    },
  });
}

export function updateToken(socket: Socket, token: string | null): void {
  if (!token) {
    logger.warn("Attempted to update socket with null token");
    return;
  }

  if (socket.auth && typeof socket.auth === 'object') {
    socket.auth.token = token;
  } else {
    socket.auth = { token };
  }

  if (socket.io && socket.io.opts) {
    socket.io.opts.query = { ...socket.io.opts.query, token };
  }

  if (socket.connected) {
    logger.info("Token updated, reconnecting socket with new token...");
    socket.once("disconnect", () => {
      socket.connect();
    });
    socket.disconnect();
  }
}

export interface SocketEvents {
  join: () => void;
  skip: () => void;
  disconnect: () => void;
  "joined-queue": (data: { message: string; queueSize: number }) => void;
  "session-waiting": (data: { message: string; positionInQueue: number; queueSize: number }) => void;
  "session-activated": (data: { message: string }) => void;
  matched: (data: { roomId: string; peerId: string; isOfferer: boolean }) => void;
  signal: (data: SignalData) => void;
  "chat-message": (data: { message: string; timestamp: number; senderId: string }) => void;
  "peer-left": (data: { message: string }) => void;
  "peer-skipped": (data: { message: string; queueSize: number }) => void;
  "end-call": (data: { message: string }) => void;
  skipped: (data: { message: string; queueSize: number }) => void;
  error: (data: { message: string }) => void;
  "queue-timeout": (data: { message: string }) => void;
}

export interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

