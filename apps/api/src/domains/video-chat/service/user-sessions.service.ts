import { randomUUID } from "crypto";
import { type Namespace, type Socket } from "socket.io";
import { createLogger } from "@repo/logger";

type SessionState = "active" | "disconnected";

interface UserSession {
  sessionId: string;
  userId: string;
  socketId: string;
  state: SessionState;
  lastSeenAt: number;
  createdAt: number;
}

const logger = createLogger("api:video-chat:user-sessions:service");

export class UserSessionService {
  private sessions: Map<string, UserSession> = new Map();
  private replacedSocketIds: Set<string> = new Set();
  private readonly sessionTtlMs = 60_000;

  tryActivateSession(
    userId: string,
    socket: Socket,
    io: Namespace,
  ): { activated: boolean; sessionId?: string } {
    if (!userId || userId === "unknown") {
      return { activated: true };
    }

    this.clearStaleSession(userId, io);

    const socketId = socket.id;
    const existing = this.sessions.get(userId);
    if (existing?.socketId === socketId) {
      this.touchSession(existing, "active");
      return { activated: true, sessionId: existing.sessionId };
    }

    if (existing) {
      this.replaceSession(existing, io);
    }

    const now = Date.now();
    const session: UserSession = {
      sessionId: randomUUID(),
      userId,
      socketId,
      state: "active",
      lastSeenAt: now,
      createdAt: now,
    };
    this.sessions.set(userId, session);
    return { activated: true, sessionId: session.sessionId };
  }

  deactivateSession(userId: string, socketId: string): void {
    const session = this.sessions.get(userId);
    if (!session || session.socketId !== socketId) {
      return;
    }
    this.sessions.delete(userId);
  }

  isActiveSession(userId: string, socketId: string, io: Namespace): boolean {
    const session = this.clearStaleSession(userId, io);
    if (!session) {
      return false;
    }
    if (session.socketId !== socketId) {
      return false;
    }
    this.touchSession(session, "active");
    return true;
  }

  isReplacedSocket(socketId: string): boolean {
    return this.replacedSocketIds.has(socketId);
  }

  acknowledgeReplacedSocket(socketId: string): void {
    this.replacedSocketIds.delete(socketId);
  }

  getActiveSocketId(userId: string): string | undefined {
    return this.sessions.get(userId)?.socketId;
  }

  private clearStaleSession(userId: string, io: Namespace): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) {
      return undefined;
    }
    const now = Date.now();
    const socket = io.sockets.get(session.socketId);
    if (!socket || !socket.connected) {
      this.sessions.delete(userId);
      return undefined;
    }
    if (now - session.lastSeenAt > this.sessionTtlMs) {
      this.sessions.delete(userId);
      return undefined;
    }
    return session;
  }

  private replaceSession(existing: UserSession, io: Namespace): void {
    const existingSocket = io.sockets.get(existing.socketId);
    if (existingSocket?.connected) {
      this.replacedSocketIds.add(existing.socketId);
      existingSocket.emit("session-replaced", {
        message: "Session replaced by a new connection.",
      });
      existingSocket.disconnect(true);
      logger.debug("Session replaced: user=%s oldSocket=%s", existing.userId, existing.socketId);
    }
    this.sessions.delete(existing.userId);
  }

  private touchSession(session: UserSession, state: SessionState): void {
    session.state = state;
    session.lastSeenAt = Date.now();
  }
}

