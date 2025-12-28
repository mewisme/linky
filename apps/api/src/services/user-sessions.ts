import { type Socket } from "socket.io";
import { logger } from "../utils/logger.js";

interface WaitingSession {
  socketId: string;
  socket: Socket;
  joinedAt: Date;
}

/**
 * UserSessionService manages active sessions per user ID
 * Only allows one active session per user at a time
 * Queues additional sessions and activates them in order when active session ends
 */
export class UserSessionService {
  // Map of userId -> active socketId
  private activeSessions: Map<string, string> = new Map();

  // Map of userId -> queue of waiting sessions
  private waitingQueues: Map<string, WaitingSession[]> = new Map();

  /**
   * Try to activate a session for a user
   * Returns true if activated immediately, false if queued
   */
  tryActivateSession(userId: string, socket: Socket): { activated: boolean; positionInQueue?: number } {
    const socketId = socket.id;
    const activeSocketId = this.activeSessions.get(userId);

    if (!activeSocketId) {
      // No active session, activate immediately
      this.activeSessions.set(userId, socketId);
      logger.info("Session activated for user:", userId, "socket:", socketId);
      return { activated: true };
    }

    // Check if this is the active session (reconnection scenario)
    if (activeSocketId === socketId) {
      logger.info("Session already active for user:", userId, "socket:", socketId);
      return { activated: true };
    }

    // Active session exists, add to waiting queue
    const queue = this.waitingQueues.get(userId) || [];

    // Check if already in queue
    if (queue.some((session) => session.socketId === socketId)) {
      const position = queue.findIndex((s) => s.socketId === socketId) + 1;
      logger.warn("Session already in waiting queue:", userId, "socket:", socketId, "position:", position);
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

    logger.info("Session queued for user:", userId, "socket:", socketId, "position in queue:", position);
    return { activated: false, positionInQueue: position };
  }

  /**
   * Deactivate a session and activate the next one in queue
   */
  deactivateSession(userId: string, socketId: string): void {
    const activeSocketId = this.activeSessions.get(userId);

    // Check if this is the active session
    if (activeSocketId !== socketId) {
      // Not the active session, just remove from waiting queue if present
      const queue = this.waitingQueues.get(userId) || [];
      const index = queue.findIndex((session) => session.socketId === socketId);
      if (index !== -1) {
        queue.splice(index, 1);
        if (queue.length === 0) {
          this.waitingQueues.delete(userId);
        } else {
          this.waitingQueues.set(userId, queue);
        }
        logger.info("Session removed from waiting queue:", userId, "socket:", socketId);
      }
      return;
    }

    // Remove active session
    this.activeSessions.delete(userId);
    logger.info("Session deactivated for user:", userId, "socket:", socketId);

    // Activate next session in queue
    const queue = this.waitingQueues.get(userId) || [];
    if (queue.length > 0) {
      const nextSession = queue.shift()!;
      this.activeSessions.set(userId, nextSession.socketId);

      if (queue.length === 0) {
        this.waitingQueues.delete(userId);
      } else {
        this.waitingQueues.set(userId, queue);
      }

      logger.info("Next session activated for user:", userId, "socket:", nextSession.socketId);

      // Notify the newly activated session
      nextSession.socket.emit("session-activated", {
        message: "Your session is now active. You can proceed.",
      });
    }
  }

  /**
   * Check if a socket is the active session for a user
   */
  isActiveSession(userId: string, socketId: string): boolean {
    return this.activeSessions.get(userId) === socketId;
  }

  /**
   * Get the active socket ID for a user
   */
  getActiveSocketId(userId: string): string | undefined {
    return this.activeSessions.get(userId);
  }

  /**
   * Get queue position for a waiting session
   */
  getQueuePosition(userId: string, socketId: string): number | null {
    const queue = this.waitingQueues.get(userId) || [];
    const index = queue.findIndex((session) => session.socketId === socketId);
    return index !== -1 ? index + 1 : null;
  }

  /**
   * Get queue size for a user
   */
  getQueueSize(userId: string): number {
    return this.waitingQueues.get(userId)?.length || 0;
  }

  /**
   * Clean up all sessions for a user (for cleanup purposes)
   */
  cleanupUserSessions(userId: string): void {
    this.activeSessions.delete(userId);
    const queue = this.waitingQueues.get(userId) || [];
    queue.forEach((session) => {
      session.socket.emit("session-cancelled", {
        message: "Session cancelled due to cleanup.",
      });
    });
    this.waitingQueues.delete(userId);
    logger.info("All sessions cleaned up for user:", userId);
  }
}

