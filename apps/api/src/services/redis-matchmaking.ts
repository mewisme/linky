import { Server, type Socket } from "socket.io";
import { redisClient } from "../lib/redis/client.js";
import { Logger } from "../utils/logger.js";
import { getInterestTags } from "../lib/supabase/queries/user-details.js";
import { getUserIdByClerkId } from "../lib/supabase/queries/call-history.js";
import { findBestMatch, type QueueUser } from "../matching/interest-matcher.js";
import type { AuthenticatedSocket } from "../socket/auth.js";

const QUEUE_KEY = "match:queue";
const LOCK_KEY = "match:lock";
const LOCK_TTL = 2;
const INTEREST_TAGS_TTL = 15 * 60;
const SKIP_COOLDOWN_TTL = 10;
const MAX_QUEUE_WAIT_TIME = 5 * 60 * 1000;
const MAX_MATCHING_CANDIDATES = 50;

interface QueuedUser {
  socketId: string;
  socket: Socket;
  joinedAt: Date;
}

export class RedisMatchmakingService {
  private readonly logger = new Logger("RedisMatchmakingService");

  async enqueue(socket: Socket): Promise<boolean> {
    const socketId = socket.id;
    const authSocket = socket as AuthenticatedSocket;
    const clerkUserId = authSocket.data.userId;

    if (!clerkUserId) {
      this.logger.warn("Cannot enqueue user without Clerk ID:", socketId);
      return false;
    }

    try {
      const dbUserId = await getUserIdByClerkId(clerkUserId);
      if (!dbUserId) {
        this.logger.warn("Cannot enqueue user without database ID:", socketId, "Clerk ID:", clerkUserId);
        return false;
      }

      const existingScore = await redisClient.zScore(QUEUE_KEY, dbUserId);
      if (existingScore !== null) {
        await redisClient.set(`match:socket:${dbUserId}`, socketId, {
          EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
        });
        this.logger.info("User already in queue, updated socket:", dbUserId, socketId);
        return true;
      }

      await this.cacheUserInterests(dbUserId);

      const now = Date.now();
      await redisClient.zAdd(QUEUE_KEY, {
        score: now,
        value: dbUserId,
      });

      await redisClient.set(`match:socket:${dbUserId}`, socketId, {
        EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
      });

      const queueSize = await this.getQueueSize();
      this.logger.info("User added to queue:", dbUserId, `(Queue size: ${queueSize})`);

      return true;
    } catch (error) {
      this.logger.error("Failed to enqueue user:", socketId, error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  async dequeue(userId: string): Promise<boolean> {
    try {
      const removed = await redisClient.zRem(QUEUE_KEY, userId);
      await redisClient.del(`match:socket:${userId}`);

      if (removed > 0) {
        const queueSize = await this.getQueueSize();
        this.logger.info("User removed from queue:", userId, `(Queue size: ${queueSize})`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Failed to dequeue user:", userId, error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  async isInQueue(userId: string): Promise<boolean> {
    try {
      const score = await redisClient.zScore(QUEUE_KEY, userId);
      return score !== null;
    } catch (error) {
      this.logger.error("Failed to check queue status:", userId, error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  async getQueueSize(): Promise<number> {
    try {
      return await redisClient.zCard(QUEUE_KEY);
    } catch (error) {
      this.logger.error("Failed to get queue size:", error instanceof Error ? error.message : "Unknown error");
      return 0;
    }
  }

  async recordSkip(skipperUserId: string, skippedUserId: string): Promise<void> {
    try {
      const skipKey = `match:skip:${skipperUserId}`;
      await redisClient.sAdd(skipKey, skippedUserId);
      await redisClient.expire(skipKey, SKIP_COOLDOWN_TTL);

      this.logger.info("Skip recorded:", skipperUserId, "->", skippedUserId, `(Cooldown: ${SKIP_COOLDOWN_TTL}s)`);
    } catch (error) {
      this.logger.error("Failed to record skip:", skipperUserId, skippedUserId, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async tryMatch(io: Server): Promise<QueuedUser[] | null> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return null;
    }

    try {
      const queueSize = await this.getQueueSize();
      if (queueSize < 2) {
        return null;
      }

      const candidateCount = Math.min(queueSize, MAX_MATCHING_CANDIDATES);
      const queueMembers = await redisClient.zRangeWithScores(QUEUE_KEY, 0, candidateCount - 1);

      if (queueMembers.length < 2) {
        return null;
      }

      const userIds = queueMembers.map((m) => m.value);
      const skipSets = await this.loadSkipSets(userIds);
      const interestTagsMap = await this.loadInterestTags(userIds);

      const queueUsers: QueueUser[] = [];
      const now = Date.now();

      for (const member of queueMembers) {
        const userId = member.value;
        const socketId = await redisClient.get(`match:socket:${userId}`);

        if (!socketId) {
          await this.dequeue(userId);
          continue;
        }

        const socket = io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          await this.dequeue(userId);
          continue;
        }

        const interestTags = interestTagsMap.get(userId) || [];

        queueUsers.push({
          userId,
          interestTags,
          joinedAt: member.score,
        });
      }

      if (queueUsers.length < 2) {
        return null;
      }

      const matchesWithCommonInterests: Array<{ userA: QueueUser; userB: QueueUser; score: number; commonInterests: number }> = [];
      const matchesWithoutCommonInterests: Array<{ userA: QueueUser; userB: QueueUser; score: number; commonInterests: number }> = [];

      for (let i = 0; i < queueUsers.length; i++) {
        for (let j = i + 1; j < queueUsers.length; j++) {
          const userA = queueUsers[i]!;
          const userB = queueUsers[j]!;

          const skipSetA = skipSets.get(userA.userId);
          const skipSetB = skipSets.get(userB.userId);
          if (skipSetA?.has(userB.userId) || skipSetB?.has(userA.userId)) {
            continue;
          }

          const tagsA = new Set(userA.interestTags);
          const tagsB = new Set(userB.interestTags);
          let commonInterests = 0;
          let score = 0;

          for (const tag of tagsA) {
            if (tagsB.has(tag)) {
              commonInterests++;
              score += 100;
            }
          }

          if (commonInterests > 0 && tagsA.size > 0 && tagsB.size > 0) {
            score += 50;
          }

          const waitTimeA = now - userA.joinedAt;
          const waitTimeB = now - userB.joinedAt;
          const avgWaitTime = (waitTimeA + waitTimeB) / 2;
          const fairnessBonus = Math.min((avgWaitTime / 1000) * 0.1, 20);
          score += fairnessBonus;

          if (commonInterests > 0) {
            matchesWithCommonInterests.push({ userA, userB, score, commonInterests });
          } else {
            matchesWithoutCommonInterests.push({ userA, userB, score, commonInterests });
          }
        }
      }

      const candidates = matchesWithCommonInterests.length > 0
        ? matchesWithCommonInterests
        : matchesWithoutCommonInterests;

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => {
        if (a.commonInterests !== b.commonInterests) {
          return b.commonInterests - a.commonInterests;
        }
        return b.score - a.score;
      });

      const bestMatch = candidates[0];
      if (!bestMatch) {
        return null;
      }

      const socketIdA = await redisClient.get(`match:socket:${bestMatch.userA.userId}`);
      const socketIdB = await redisClient.get(`match:socket:${bestMatch.userB.userId}`);

      if (!socketIdA || !socketIdB) {
        return null;
      }

      const socketA = io.sockets.sockets.get(socketIdA);
      const socketB = io.sockets.sockets.get(socketIdB);

      if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
        return null;
      }

      await this.dequeue(bestMatch.userA.userId);
      await this.dequeue(bestMatch.userB.userId);

      this.logger.info(
        "Matched users:",
        bestMatch.userA.userId,
        "and",
        bestMatch.userB.userId,
        `(Score: ${bestMatch.score.toFixed(2)}, Common interests: ${bestMatch.commonInterests})`
      );

      return [
        {
          socketId: socketIdA,
          socket: socketA,
          joinedAt: new Date(bestMatch.userA.joinedAt),
        },
        {
          socketId: socketIdB,
          socket: socketB,
          joinedAt: new Date(bestMatch.userB.joinedAt),
        },
      ];
    } finally {
      await this.releaseLock();
    }
  }

  async removeUser(userId: string): Promise<void> {
    await this.dequeue(userId);
  }

  async cleanupStaleSockets(io: Server): Promise<void> {
    try {
      const queueMembers = await redisClient.zRange(QUEUE_KEY, 0, MAX_MATCHING_CANDIDATES - 1);
      const staleUserIds: string[] = [];

      for (const userId of queueMembers) {
        const socketId = await redisClient.get(`match:socket:${userId}`);
        if (!socketId) {
          staleUserIds.push(userId);
          continue;
        }

        const socket = io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          staleUserIds.push(userId);
        }
      }

      if (staleUserIds.length > 0) {
        for (const userId of staleUserIds) {
          await this.dequeue(userId);
        }
        this.logger.info("Cleaned up", staleUserIds.length, "stale socket references");
      }
    } catch (error) {
      this.logger.error("Failed to cleanup stale sockets:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async cleanupExpiredEntries(io: Server): Promise<void> {
    try {
      const queueMembers = await redisClient.zRangeWithScores(QUEUE_KEY, 0, MAX_MATCHING_CANDIDATES - 1);
      const now = Date.now();
      const expiredUserIds: string[] = [];

      for (const member of queueMembers) {
        const waitTime = now - member.score;
        if (waitTime > MAX_QUEUE_WAIT_TIME) {
          expiredUserIds.push(member.value);
        }
      }

      if (expiredUserIds.length > 0) {
        for (const userId of expiredUserIds) {
          await this.dequeue(userId);
          const socketId = await redisClient.get(`match:socket:${userId}`);
          if (socketId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit("queue-timeout", {
                message: "Queue timeout. Please try again.",
              });
            }
          }
        }
        this.logger.info("Cleaned up", expiredUserIds.length, "expired queue entries");
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired entries:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async cacheUserInterests(dbUserId: string): Promise<void> {
    try {
      const interestTags = await getInterestTags(dbUserId);
      const key = `user:interests:${dbUserId}`;

      const pipeline = redisClient.multi();
      pipeline.del(key);
      if (interestTags.length > 0) {
        pipeline.sAdd(key, interestTags);
        pipeline.expire(key, INTEREST_TAGS_TTL);
      } else {
        pipeline.set(key, "__empty__");
        pipeline.expire(key, INTEREST_TAGS_TTL);
      }
      await pipeline.exec();

    } catch (error) {
      this.logger.error("Failed to cache user interests:", dbUserId, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async loadInterestTags(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    try {
      for (const userId of userIds) {
        const key = `user:interests:${userId}`;
        const type = await redisClient.type(key);

        if (type === "set") {
          const tags = await redisClient.sMembers(key);
          result.set(userId, tags);
        } else if (type === "string") {
          result.set(userId, []);
        } else {
          result.set(userId, []);
        }
      }
    } catch (error) {
      this.logger.error("Failed to load interest tags:", error instanceof Error ? error.message : "Unknown error");
    }

    return result;
  }

  private async loadSkipSets(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      for (const userId of userIds) {
        const skipKey = `match:skip:${userId}`;
        const skippedUserIds = await redisClient.sMembers(skipKey);
        if (skippedUserIds.length > 0) {
          result.set(userId, new Set(skippedUserIds));
        }
      }
    } catch (error) {
      this.logger.error("Failed to load skip sets:", error instanceof Error ? error.message : "Unknown error");
    }

    return result;
  }

  private async acquireLock(): Promise<boolean> {
    try {
      const result = await redisClient.set(LOCK_KEY, "1", {
        NX: true,
        EX: LOCK_TTL,
      });
      return result === "OK";
    } catch (error) {
      this.logger.error("Failed to acquire lock:", error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await redisClient.del(LOCK_KEY);
    } catch (error) {
      this.logger.error("Failed to release lock:", error instanceof Error ? error.message : "Unknown error");
    }
  }
}
