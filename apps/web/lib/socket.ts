/**
 * Socket.IO client configuration and utilities
 */

import { Socket, io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Creates a Socket.IO connection to the signaling server with Clerk authentication
 * @param token - Clerk session token (from useAuth().getToken())
 */
export function createSocket(token: string | null): Socket {
  if (!token) {
    throw new Error("Authentication token is required to create socket connection");
  }

  return io(API_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token,
    },
    // Also include token in query as fallback
    query: {
      token,
    },
  });
}

/**
 * Socket event types for type safety
 */
export interface SocketEvents {
  // Client → Server
  join: () => void;
  skip: () => void;
  disconnect: () => void;

  // Server → Client
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

