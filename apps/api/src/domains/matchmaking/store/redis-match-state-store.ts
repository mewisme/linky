import type { Socket } from "socket.io";
import type { MatchStateStore, QueueEntry } from "./match-state-store.interface.js";
import { createLogger } from "@repo/logger";
import { redisClient } from "@/infra/redis/client.js";
import { getInterestTags } from "@/infra/supabase/repositories/user-details.js";
import { getFavoritesByUserId } from "@/infra/supabase/repositories/favorites.js";
import { getBlockedUserIds } from "@/infra/supabase/repositories/user-blocks.js";

const QUEUE_KEY = "match:queue";
const SKIP_COOLDOWN_TTL = 10;
const MAX_QUEUE_WAIT_TIME = 5 * 60 * 1000;
const INTEREST_TAGS_TTL = 15 * 60;
const FAVORITES_TTL = 10 * 60;
const BLOCKS_TTL = 30 * 60;

export class RedisMatchStateStore implements MatchStateStore {
  private readonly logger = createLogger("api:matchmaking:redis:store");

  async enqueueUser(userId: string, socketId: string, socket: Socket): Promise<boolean> {
    if (!socket.connected) {
      this.logger.debug("Enqueue rejected: socket not connected userId=%s socketId=%s", userId, socketId);
      return false;
    }

    try {
      const existingScore = await redisClient.zScore(QUEUE_KEY, userId);
      if (existingScore !== null) {
        const currentSocketId = await redisClient.get(`match:socket:${userId}`);
        if (currentSocketId === socketId) {
          this.logger.debug("Enqueue idempotent: already enqueued userId=%s socketId=%s", userId, socketId);
          return true;
        }

        await redisClient.set(`match:socket:${userId}`, socketId, {
          EX: Math.floor(MAX_QUEUE_WAIT_TIME / 1000) + 60,
        });

        this.logger.debug("Enqueue socket update: userId=%s oldSocket=%s newSocket=%s", userId, currentSocketId, socketId);
        return true;
      }

      const now = Date.now();
      await redisClient.zAdd(QUEUE_KEY, {
        score: now,
        value: userId,
      });

      await redisClient.set(`match:socket:${userId}`, socketId, {
        EX: Math.floor(MAX_QUEUE_WAIT_TIME / 1000) + 60,
      });

      this.logger.debug("Enqueued user: userId=%s socketId=%s", userId, socketId);
      return true;
    } catch (error) {
      this.logger.error("Enqueue failed for user: %o", error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dequeueUser(userId: string, reason?: string): Promise<boolean> {
    try {
      const socketId = await redisClient.get(`match:socket:${userId}`);
      const removed = await redisClient.zRem(QUEUE_KEY, userId);
      await redisClient.del(`match:socket:${userId}`);

      if (removed > 0) {
        this.logger.debug("Dequeued user: userId=%s socketId=%s reason=%s", userId, socketId || "none", reason || "unspecified");
      }

      return removed > 0;
    } catch (error) {
      this.logger.error("Dequeue failed for user %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async getQueuedUsers(limit = 50): Promise<QueueEntry[]> {
    try {
      const queueMembers = await redisClient.zRangeWithScores(QUEUE_KEY, 0, limit - 1);
      const userIds = queueMembers.map((m) => m.value);

      if (userIds.length === 0) {
        return [];
      }

      const socketIds = await redisClient.mGet(userIds.map((userId) => `match:socket:${userId}`));

      const entries: QueueEntry[] = [];
      for (let i = 0; i < queueMembers.length; i++) {
        const member = queueMembers[i];
        const socketId = socketIds[i];

        if (member && socketId) {
          entries.push({
            userId: member.value,
            socketId,
            joinedAt: member.score,
          });
        }
      }

      return entries;
    } catch (error) {
      this.logger.error("Failed to get queued users: %o", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getUserSocketId(userId: string): Promise<string | null> {
    try {
      return await redisClient.get(`match:socket:${userId}`);
    } catch (error) {
      this.logger.error("Failed to get socket ID for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  async setUserSocketId(userId: string, socketId: string, socket: Socket): Promise<void> {
    if (!socket.connected) {
      this.logger.debug("setUserSocketId rejected: socket not connected userId=%s socketId=%s", userId, socketId);
      return;
    }

    try {
      await redisClient.set(`match:socket:${userId}`, socketId, {
        EX: Math.floor(MAX_QUEUE_WAIT_TIME / 1000) + 60,
      });
    } catch (error) {
      this.logger.error("Failed to set socket ID for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async removeUserSocket(userId: string): Promise<void> {
    try {
      await redisClient.del(`match:socket:${userId}`);
      await this.dequeueUser(userId, "socket-removed");
    } catch (error) {
      this.logger.error("Failed to remove socket for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async recordSkip(skipperUserId: string, skippedUserId: string): Promise<void> {
    try {
      const skipKey = `match:skip:${skipperUserId}`;
      await redisClient.sAdd(skipKey, skippedUserId);
      await redisClient.expire(skipKey, SKIP_COOLDOWN_TTL);
    } catch (error) {
      this.logger.error(
        "Failed to record skip %s -> %s: %o",
        skipperUserId,
        skippedUserId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async hasSkip(userAId: string, userBId: string): Promise<boolean> {
    try {
      const [hasAtoB, hasBtoA] = await Promise.all([
        redisClient.sIsMember(`match:skip:${userAId}`, userBId),
        redisClient.sIsMember(`match:skip:${userBId}`, userAId),
      ]);

      return Boolean(hasAtoB) || Boolean(hasBtoA);
    } catch (error) {
      this.logger.error(
        "Failed to check skip %s <-> %s: %o",
        userAId,
        userBId,
        error instanceof Error ? error : new Error(String(error)),
      );
      return false;
    }
  }

  async getQueueSize(): Promise<number> {
    try {
      return await redisClient.zCard(QUEUE_KEY);
    } catch (error) {
      this.logger.error("Failed to get queue size: %o", error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  async isInQueue(userId: string): Promise<boolean> {
    try {
      const score = await redisClient.zScore(QUEUE_KEY, userId);
      return score !== null;
    } catch (error) {
      this.logger.error("Failed to check queue status: %s %o", userId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async cacheUserData(userId: string): Promise<void> {
    await Promise.all([
      this.cacheUserInterests(userId),
      this.cacheUserFavorites(userId),
      this.cacheUserBlocks(userId),
    ]);
  }

  async getUserInterests(userId: string): Promise<string[]> {
    try {
      const key = `user:interests:${userId}`;
      return await redisClient.sMembers(key);
    } catch (error) {
      this.logger.error("Failed to get interests for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getUserFavorites(userId: string): Promise<string[]> {
    try {
      const key = `user:favorites:${userId}`;
      return await redisClient.sMembers(key);
    } catch (error) {
      this.logger.error("Failed to get favorites for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getUserBlocks(userId: string): Promise<string[]> {
    try {
      const key = `user:blocks:${userId}`;
      return await redisClient.sMembers(key);
    } catch (error) {
      this.logger.error("Failed to get blocks for %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async cleanup(): Promise<void> {
    try {
      const queueMembers = await redisClient.zRangeWithScores(QUEUE_KEY, 0, 49);
      const now = Date.now();
      const expiredUserIds: string[] = [];

      for (const member of queueMembers) {
        const waitTime = now - member.score;
        if (waitTime > MAX_QUEUE_WAIT_TIME) {
          expiredUserIds.push(member.value);
        }
      }

      if (expiredUserIds.length > 0) {
        await Promise.all(expiredUserIds.map((userId) => this.dequeueUser(userId, "expired")));
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired entries: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async cacheUserInterests(userId: string): Promise<void> {
    try {
      const interestTags = await getInterestTags(userId);
      const key = `user:interests:${userId}`;

      await redisClient.del(key);

      if (interestTags.length > 0) {
        await redisClient.sAdd(key, interestTags);
        await redisClient.expire(key, INTEREST_TAGS_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user interests: %s %o",
        userId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async cacheUserFavorites(userId: string): Promise<void> {
    try {
      const favorites = await getFavoritesByUserId(userId);
      const key = `user:favorites:${userId}`;

      await redisClient.del(key);

      if (favorites.length > 0) {
        await redisClient.sAdd(key, favorites);
        await redisClient.expire(key, FAVORITES_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user favorites: %s %o",
        userId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async cacheUserBlocks(userId: string): Promise<void> {
    try {
      const blocks = await getBlockedUserIds(userId);
      const key = `user:blocks:${userId}`;

      await redisClient.del(key);

      if (blocks.length > 0) {
        await redisClient.sAdd(key, blocks);
        await redisClient.expire(key, BLOCKS_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user blocks: %s %o",
        userId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
