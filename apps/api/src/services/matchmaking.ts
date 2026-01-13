import { type Socket } from "socket.io";
import { logger } from "../utils/logger.js";

interface QueuedUser {
  socketId: string;
  socket: Socket;
  joinedAt: Date;
}

interface SkipRecord {
  timestamp: number;
}

export class MatchmakingService {
  private queue: QueuedUser[] = [];
  private readonly maxQueueWaitTime = 5 * 60 * 1000; // 5 minutes
  private readonly skipCooldownTime = 3 * 1000; // 3 seconds
  private skipRecords: Map<string, SkipRecord> = new Map(); // Key: "socketId1:socketId2" (sorted)

  enqueue(socket: Socket): boolean {
    const socketId = socket.id;

    if (this.queue.some((user) => user.socketId === socketId)) {
      logger.warn("User already in queue:", socketId);
      return false;
    }

    const user: QueuedUser = {
      socketId,
      socket,
      joinedAt: new Date(),
    };

    this.queue.push(user);
    logger.info("User added to queue:", socketId, `(Queue size: ${this.queue.length})`);

    this.cleanupStaleEntries();

    return true;
  }

  dequeue(socketId: string): boolean {
    const index = this.queue.findIndex((user) => user.socketId === socketId);
    if (index === -1) {
      logger.warn("Attempted to remove user not in queue:", socketId);
      return false;
    }

    const user = this.queue[index];
    if (!user) {
      logger.warn("User data not found at index:", index);
      return false;
    }

    const waitTime = Date.now() - user.joinedAt.getTime();
    this.queue.splice(index, 1);
    logger.info("User removed from queue:", socketId, `(Queue size: ${this.queue.length}, waited: ${Math.round(waitTime / 1000)}s)`);
    return true;
  }

  isInQueue(socketId: string): boolean {
    return this.queue.some((user) => user.socketId === socketId);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  recordSkip(skipperId: string, skippedId: string): void {
    const key = this.getSkipKey(skipperId, skippedId);
    this.skipRecords.set(key, {
      timestamp: Date.now(),
    });
    logger.info("Skip recorded:", skipperId, "->", skippedId, "Cooldown: 3 seconds");

    this.cleanupExpiredSkips();
  }

  private canMatch(user1Id: string, user2Id: string): boolean {
    const key = this.getSkipKey(user1Id, user2Id);
    const skipRecord = this.skipRecords.get(key);

    if (!skipRecord) {
      return true;
    }

    const timeSinceSkip = Date.now() - skipRecord.timestamp;
    if (timeSinceSkip >= this.skipCooldownTime) {
      this.skipRecords.delete(key);
      return true;
    }

    const remainingCooldown = Math.ceil((this.skipCooldownTime - timeSinceSkip) / 1000);
    logger.info("Skip cooldown active:", user1Id, "and", user2Id, `(${remainingCooldown}s remaining)`);
    return false;
  }

  private getSkipKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  private cleanupExpiredSkips(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.skipRecords.forEach((record, key) => {
      if (now - record.timestamp >= this.skipCooldownTime) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => {
      this.skipRecords.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.info("Cleaned up", expiredKeys.length, "expired skip records");
    }
  }

  tryMatch(): QueuedUser[] | null {
    if (this.queue.length < 2) {
      if (this.queue.length === 1) {
        logger.info("Matchmaking attempt: Only 1 user in queue, waiting for more");
      }
      return null;
    }

    logger.info("Attempting to match users, queue size:", this.queue.length);

    this.cleanupExpiredSkips();

    const maxAttempts = Math.min(this.queue.length * 2, 10); // Limit attempts to avoid infinite loop
    let attempts = 0;

    while (attempts < maxAttempts) {
      const firstIndex = Math.floor(Math.random() * this.queue.length);
      let secondIndex = Math.floor(Math.random() * this.queue.length);

      while (secondIndex === firstIndex && this.queue.length > 1) {
        secondIndex = Math.floor(Math.random() * this.queue.length);
      }

      const user1 = this.queue[firstIndex];
      const user2 = this.queue[secondIndex];

      if (!user1 || !user2) {
        return null;
      }

      if (this.canMatch(user1.socketId, user2.socketId)) {
        this.queue = this.queue.filter(
          (user) => user.socketId !== user1.socketId && user.socketId !== user2.socketId
        );

        logger.info("Matched users:", user1.socketId, "and", user2.socketId);
        return [user1, user2];
      }

      attempts++;
    }

    if (this.queue.length >= 2) {
      const firstIndex = Math.floor(Math.random() * this.queue.length);
      let secondIndex = Math.floor(Math.random() * this.queue.length);

      while (secondIndex === firstIndex && this.queue.length > 1) {
        secondIndex = Math.floor(Math.random() * this.queue.length);
      }

      const user1 = this.queue[firstIndex];
      const user2 = this.queue[secondIndex];

      if (user1 && user2) {
        this.queue = this.queue.filter(
          (user) => user.socketId !== user1.socketId && user.socketId !== user2.socketId
        );

        logger.warn("Matched users despite cooldown (no other options):", user1.socketId, "and", user2.socketId);
        return [user1, user2];
      }
    }

    logger.info("Could not find a valid match after", attempts, "attempts");
    return null;
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    const staleUsers = this.queue.filter((user) => {
      const waitTime = now - user.joinedAt.getTime();
      return waitTime > this.maxQueueWaitTime;
    });

    staleUsers.forEach((user) => {
      logger.warn("Removing stale user from queue:", user.socketId);
      this.dequeue(user.socketId);
      user.socket.emit("queue-timeout", {
        message: "Queue timeout. Please try again.",
      });
    });
  }

  removeUser(socketId: string): void {
    this.dequeue(socketId);
  }
}

