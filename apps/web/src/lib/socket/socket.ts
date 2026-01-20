import { Manager, Socket } from "socket.io-client";

import type { UsersAPI } from "@/types/users.types";

export interface NamespaceSockets {
  chat: Socket;
  admin: Socket;
}

let manager: Manager | null = null;
let managerBaseUrl: string | null = null;

function getSocketManager(baseUrl: string): Manager {
  if (manager && managerBaseUrl === baseUrl) {
    return manager;
  }

  manager?.removeAllListeners();

  managerBaseUrl = baseUrl;
  manager = new Manager(baseUrl, {
    path: "/ws",
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return manager;
}

export async function createNamespaceSockets(token?: string | null): Promise<NamespaceSockets> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  const socketManager = getSocketManager(baseUrl);

  const chat = socketManager.socket("/chat", {
    auth: { token },
  });

  const admin = socketManager.socket("/admin", {
    auth: { token },
  });

  return { chat, admin };
}

export async function createSocket(token?: string | null): Promise<Socket> {
  return (await createNamespaceSockets(token)).chat;
}

export function updateToken(socket: Socket, token: string | null): void {
  if (!token) {
    console.warn("Attempted to update socket with null token");
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
    console.info("Token updated, reconnecting socket with new token...");
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
  matched: (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => void;
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
  iceRestart?: boolean;
}
