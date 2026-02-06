import { type Socket } from "socket.io";
import { createLogger } from "@repo/logger";
import type { WaitingSession } from "@/domains/video-chat/types/session.types.js";

export class UserSessionService {
  private activeSessions: Map<string, string> = new Map();

  private waitingQueues: Map<string, WaitingSession[]> = new Map();
  private readonly logger = createLogger("api:video-chat:user-sessions:service");

  tryActivateSession(userId: string, socket: Socket): { activated: boolean; positionInQueue?: number } {
    const socketId = socket.id;
    const activeSocketId = this.activeSessions.get(userId);

    if (!activeSocketId) {
      this.activeSessions.set(userId, socketId);
      return { activated: true };
    }

    if (activeSocketId === socketId) {
      return { activated: true };
    }

    const queue = this.waitingQueues.get(userId) || [];

    if (queue.some((session) => session.socketId === socketId)) {
      const position = queue.findIndex((s) => s.socketId === socketId) + 1;
      return { activated: false, positionInQueue: position };
    }

    const waitingSession: WaitingSession = {
      socketId,
      socket,
      joinedAt: new Date(),
    };

    queue.push(waitingSession);
    this.waitingQueues.set(userId, queue);
    const position = queue.length;

    return { activated: false, positionInQueue: position };
  }

  deactivateSession(userId: string, socketId: string): void {
    const activeSocketId = this.activeSessions.get(userId);

    if (activeSocketId !== socketId) {
      const queue = this.waitingQueues.get(userId) || [];
      const index = queue.findIndex((session) => session.socketId === socketId);
      if (index !== -1) {
        queue.splice(index, 1);
        if (queue.length === 0) {
          this.waitingQueues.delete(userId);
        } else {
          this.waitingQueues.set(userId, queue);
        }
      }
      return;
    }

    this.activeSessions.delete(userId);

    const queue = this.waitingQueues.get(userId) || [];
    if (queue.length > 0) {
      const nextSession = queue.shift()!;
      this.activeSessions.set(userId, nextSession.socketId);

      if (queue.length === 0) {
        this.waitingQueues.delete(userId);
      } else {
        this.waitingQueues.set(userId, queue);
      }

      nextSession.socket.emit("session-activated", {
        message: "Your session is now active. You can proceed.",
      });
    }
  }

  isActiveSession(userId: string, socketId: string): boolean {
    return this.activeSessions.get(userId) === socketId;
  }

  getActiveSocketId(userId: string): string | undefined {
    return this.activeSessions.get(userId);
  }

  getQueuePosition(userId: string, socketId: string): number | null {
    const queue = this.waitingQueues.get(userId) || [];
    const index = queue.findIndex((session) => session.socketId === socketId);
    return index !== -1 ? index + 1 : null;
  }

  getQueueSize(userId: string): number {
    return this.waitingQueues.get(userId)?.length || 0;
  }

  cleanupUserSessions(userId: string): void {
    this.activeSessions.delete(userId);
    const queue = this.waitingQueues.get(userId) || [];
    queue.forEach((session) => {
      session.socket.emit("session-cancelled", {
        message: "Session cancelled due to cleanup.",
      });
    });
    this.waitingQueues.delete(userId);
  }
}

