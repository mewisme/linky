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

/**
 * Matchmaking service that pairs users randomly for 1-to-1 video chat
 */
export class MatchmakingService {
  private queue: QueuedUser[] = [];
  private readonly maxQueueWaitTime = 5 * 60 * 1000; // 5 minutes
  private readonly skipCooldownTime = 3 * 1000; // 3 seconds
  private skipRecords: Map<string, SkipRecord> = new Map(); // Key: "socketId1:socketId2" (sorted)

  /**
   * Add a user to the matchmaking queue
   * Returns true if user was added, false if already in queue
   */
  enqueue(socket: Socket): boolean {
    const socketId = socket.id;

    // Check if user is already in queue
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

    // Clean up stale entries periodically
    this.cleanupStaleEntries();

    return true;
  }

  /**
   * Remove a user from the matchmaking queue
   */
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

  /**
   * Check if a user is in the queue
   */
  isInQueue(socketId: string): boolean {
    return this.queue.some((user) => user.socketId === socketId);
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Record a skip between two users
   */
  recordSkip(skipperId: string, skippedId: string): void {
    // Create a sorted key to ensure consistent lookup regardless of order
    const key = this.getSkipKey(skipperId, skippedId);
    this.skipRecords.set(key, {
      timestamp: Date.now(),
    });
    logger.info("Skip recorded:", skipperId, "->", skippedId, "Cooldown: 3 seconds");
    
    // Clean up expired skip records
    this.cleanupExpiredSkips();
  }

  /**
   * Check if two users can be matched (not in skip cooldown)
   */
  private canMatch(user1Id: string, user2Id: string): boolean {
    const key = this.getSkipKey(user1Id, user2Id);
    const skipRecord = this.skipRecords.get(key);
    
    if (!skipRecord) {
      return true; // No skip record, can match
    }

    const timeSinceSkip = Date.now() - skipRecord.timestamp;
    if (timeSinceSkip >= this.skipCooldownTime) {
      // Cooldown expired, remove record and allow match
      this.skipRecords.delete(key);
      return true;
    }

    // Still in cooldown
    const remainingCooldown = Math.ceil((this.skipCooldownTime - timeSinceSkip) / 1000);
    logger.info("Skip cooldown active:", user1Id, "and", user2Id, `(${remainingCooldown}s remaining)`);
    return false;
  }

  /**
   * Generate a consistent key for a skip pair (sorted IDs)
   */
  private getSkipKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  /**
   * Clean up expired skip records
   */
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

  /**
   * Try to match two users from the queue
   * Returns the matched pair or null if not enough users
   */
  tryMatch(): QueuedUser[] | null {
    if (this.queue.length < 2) {
      if (this.queue.length === 1) {
        logger.info("Matchmaking attempt: Only 1 user in queue, waiting for more");
      }
      return null;
    }

    logger.info("Attempting to match users, queue size:", this.queue.length);

    // Clean up expired skip records first
    this.cleanupExpiredSkips();

    // Try to find a valid match (users not in skip cooldown)
    const maxAttempts = Math.min(this.queue.length * 2, 10); // Limit attempts to avoid infinite loop
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Randomly select two users
      const firstIndex = Math.floor(Math.random() * this.queue.length);
      let secondIndex = Math.floor(Math.random() * this.queue.length);

      // Ensure we select two different users
      while (secondIndex === firstIndex && this.queue.length > 1) {
        secondIndex = Math.floor(Math.random() * this.queue.length);
      }

      const user1 = this.queue[firstIndex];
      const user2 = this.queue[secondIndex];

      if (!user1 || !user2) {
        return null;
      }

      // Check if these users can be matched (not in skip cooldown)
      if (this.canMatch(user1.socketId, user2.socketId)) {
        // Remove both users from queue
        this.queue = this.queue.filter(
          (user) => user.socketId !== user1.socketId && user.socketId !== user2.socketId
        );

        logger.info("Matched users:", user1.socketId, "and", user2.socketId);
        return [user1, user2];
      }

      attempts++;
    }

    // If we couldn't find a valid match after max attempts, try any match
    // (This handles edge cases where all pairs are in cooldown)
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

  /**
   * Clean up stale queue entries (users who have been waiting too long)
   */
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

  /**
   * Remove a user and clean up
   */
  removeUser(socketId: string): void {
    this.dequeue(socketId);
  }
}

