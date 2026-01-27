import { type Socket } from "socket.io";
import { createLogger } from "@repo/logger";
import type { WaitingSession } from "../types/session.types.js";

export class UserSessionService {
  private activeSessions: Map<string, string> = new Map();

  private waitingQueues: Map<string, WaitingSession[]> = new Map();
  private readonly logger = createLogger("API:VideoChat:UserSessions:Service");

  tryActivateSession(userId: string, socket: Socket): { activated: boolean; positionInQueue?: number } {
    const socketId = socket.id;
    const activeSocketId = this.activeSessions.get(userId);

    if (!activeSocketId) {
      this.activeSessions.set(userId, socketId);
      this.logger.info("Session activated for user: %s socket: %s", userId, socketId);
      return { activated: true };
    }

    if (activeSocketId === socketId) {
      this.logger.info("Session already active for user: %s socket: %s", userId, socketId);
      return { activated: true };
    }

    const queue = this.waitingQueues.get(userId) || [];

    if (queue.some((session) => session.socketId === socketId)) {
      const position = queue.findIndex((s) => s.socketId === socketId) + 1;
      this.logger.warn("Session already in waiting queue: %s socket: %s position: %d", userId, socketId, position);
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

    this.logger.info("Session queued for user: %s socket: %s position in queue: %d", userId, socketId, position);
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
        this.logger.info("Session removed from waiting queue: %s socket: %s", userId, socketId);
      }
      return;
    }

    this.activeSessions.delete(userId);
    this.logger.info("Session deactivated for user: %s socket: %s", userId, socketId);

    const queue = this.waitingQueues.get(userId) || [];
    if (queue.length > 0) {
      const nextSession = queue.shift()!;
      this.activeSessions.set(userId, nextSession.socketId);

      if (queue.length === 0) {
        this.waitingQueues.delete(userId);
      } else {
        this.waitingQueues.set(userId, queue);
      }

      this.logger.info("Next session activated for user: %s socket: %s", userId, nextSession.socketId);

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
    this.logger.info("All sessions cleaned up for user: %s", userId);
  }
}

