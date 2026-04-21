import * as Sentry from "@sentry/nextjs";

import type { BackendUserMessage } from "@ws/shared-types";

import type { ChatErrorPayload, ChatMessagePayload, ChatTypingPayload } from "@/features/chat/types/chat-message.types";
import { Manager, Socket } from "socket.io-client";

import type { UsersAPI } from "@/entities/user/types/users.types";
import { publicEnv } from "@/shared/env/public-env";

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
  const baseUrl = publicEnv.API_URL;

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
    Sentry.logger.warn("Attempted to update socket with null token");
    return;
  }

  if (socket.auth && typeof socket.auth === 'object') {
    socket.auth.token = token;
  } else {
    socket.auth = { token };
  }

  if (socket.connected) {
    Sentry.logger.info("Token updated, reconnecting socket with new token");
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

export type UserFacingSocketPayload = {
  message: string;
  userMessage: BackendUserMessage;
};

export interface SocketEvents {
  join: () => void;
  skip: () => void;
  disconnect: () => void;
  "joined-queue": (data: UserFacingSocketPayload & { queueSize: number }) => void;
  matched: (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => void;
  signal: (data: SignalData) => void;
  "chat:message": (data: ChatMessagePayload) => void;
  "chat:typing": (data: ChatTypingPayload) => void;
  "chat:error": (data: ChatErrorPayload) => void;
  "peer-left": (data: UserFacingSocketPayload) => void;
  "peer-skipped": (data: UserFacingSocketPayload & { queueSize: number }) => void;
  "end-call": (data: UserFacingSocketPayload) => void;
  skipped: (data: UserFacingSocketPayload & { queueSize: number }) => void;
  "video-chat:error": (data: UserFacingSocketPayload) => void;
  "queue-timeout": (data: UserFacingSocketPayload) => void;
  "user:progress:update": (data: UsersAPI.Progress.GetMe.Response) => void;
  "level:up": (data: {
    eventKey?: string;
    leveledUserId?: string;
    userId: string;
    previousLevel: number;
    newLevel: number;
  }) => void;
}

export interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  iceRestart?: boolean;
}
