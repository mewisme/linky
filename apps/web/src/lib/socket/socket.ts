import { Manager, Socket } from "socket.io-client";

import type { UsersAPI } from "@/types/users.types";

export interface NamespaceSockets {
  chat: Socket;
  admin: Socket;
}

let manager: Manager | null = null;
let managerBaseUrl: string | null = null;
let chatSocket: Socket | null = null;
let adminSocket: Socket | null = null;

function getSocketManager(baseUrl: string): Manager {
  if (manager && managerBaseUrl === baseUrl) {
    return manager;
  }

  if (manager) {
    manager.removeAllListeners();
  }

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

  if (chatSocket && adminSocket) {
    if (chatSocket.connected || chatSocket.active) {
      if (token && chatSocket.auth && typeof chatSocket.auth === 'object') {
        chatSocket.auth.token = token;
      }
      if (token && adminSocket.auth && typeof adminSocket.auth === 'object') {
        adminSocket.auth.token = token;
      }
      return { chat: chatSocket, admin: adminSocket };
    }

    if (!chatSocket.connected && !chatSocket.active) {
      chatSocket.connect();
    }
    if (!adminSocket.connected && !adminSocket.active) {
      adminSocket.connect();
    }
    return { chat: chatSocket, admin: adminSocket };
  }

  const socketManager = getSocketManager(baseUrl);

  if (!chatSocket) {
    chatSocket = socketManager.socket("/chat", {
      auth: { token },
    });
  } else {
    if (token && chatSocket.auth && typeof chatSocket.auth === 'object') {
      chatSocket.auth.token = token;
    }
    if (!chatSocket.connected && !chatSocket.active) {
      chatSocket.connect();
    }
  }

  if (!adminSocket) {
    adminSocket = socketManager.socket("/admin", {
      auth: { token },
    });
  } else {
    if (token && adminSocket.auth && typeof adminSocket.auth === 'object') {
      adminSocket.auth.token = token;
    }
    if (!adminSocket.connected && !adminSocket.active) {
      adminSocket.connect();
    }
  }

  return { chat: chatSocket, admin: adminSocket };
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

export function destroySockets(): void {
  if (chatSocket) {
    chatSocket.removeAllListeners();
    chatSocket.disconnect();
    chatSocket = null;
  }
  if (adminSocket) {
    adminSocket.removeAllListeners();
    adminSocket.disconnect();
    adminSocket = null;
  }
  if (manager) {
    manager.removeAllListeners();
    manager = null;
  }
  managerBaseUrl = null;
}

export interface SocketEvents {
  join: () => void;
  skip: () => void;
  disconnect: () => void;
  "joined-queue": (data: { message: string; queueSize: number }) => void;
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
