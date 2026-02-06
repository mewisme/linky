import type { Namespace, Socket } from "socket.io";
import type { QueueUser, ScoredCandidatePair } from "@/domains/matchmaking/types/candidate.types.js";
import { calculateEmbeddingSimilarities, getEmbeddingSimilarityFromMap } from "./embedding-score.service.js";
import { calculateFavoriteType, calculateRedisCandidateScoreWithEmbedding } from "./scoring.service.js";

import type { AuthenticatedSocket } from "@/types/socket/socket-context.types.js";
import type { EmbeddingPair } from "@/domains/matchmaking/types/embedding.types.js";
import type { QueuedUser } from "@/domains/matchmaking/types/matchmaking.types.js";
import { createLogger } from "@repo/logger";
import { getBlockedUserIds } from "@/infra/supabase/repositories/user-blocks.js";
import { getFavoritesByUserId } from "@/infra/supabase/repositories/favorites.js";
import { getInterestTags } from "@/infra/supabase/repositories/user-details.js";
import { getUserEmbeddingsMap } from "@/infra/supabase/repositories/user-embeddings.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { redisClient } from "@/infra/redis/client.js";

const QUEUE_KEY = "match:queue";
const LOCK_KEY = "match:lock";
const LOCK_TTL = 2;
const INTEREST_TAGS_TTL = 15 * 60;
const FAVORITES_TTL = 10 * 60;
const BLOCKS_TTL = 30 * 60;
const SKIP_COOLDOWN_TTL = 10;
const MAX_QUEUE_WAIT_TIME = 5 * 60 * 1000;
const MAX_MATCHING_CANDIDATES = 50;

export class RedisMatchmakingService {
  private readonly logger = createLogger("api:matchmaking:redis:service");

  async enqueue(socket: Socket): Promise<boolean> {
    const socketId = socket.id;
    const authSocket = socket as AuthenticatedSocket;
    const clerkUserId = authSocket.data.userId;

    if (!clerkUserId) {
      return false;
    }

    try {
      const dbUserId = await getUserIdByClerkId(clerkUserId);
      if (!dbUserId) {
        return false;
      }

      const existingScore = await redisClient.zScore(QUEUE_KEY, dbUserId);
      if (existingScore !== null) {
        await redisClient.set(`match:socket:${dbUserId}`, socketId, {
          EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
        });
        return true;
      }

      await this.cacheUserInterests(dbUserId);
      await this.cacheUserFavorites(dbUserId);
      await this.cacheUserBlocks(dbUserId);

      const now = Date.now();
      await redisClient.zAdd(QUEUE_KEY, {
        score: now,
        value: dbUserId,
      });

      await redisClient.set(`match:socket:${dbUserId}`, socketId, {
        EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
      });

      return true;
    } catch (error) {
      this.logger.error("Enqueue failed for user: %o", error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dequeue(userId: string): Promise<boolean> {
    try {
      const removed = await redisClient.zRem(QUEUE_KEY, userId);
      await redisClient.del(`match:socket:${userId}`);
      return removed > 0;
    } catch (error) {
      this.logger.error("Dequeue failed for user %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
      return false;
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

  async getQueueSize(): Promise<number> {
    try {
      return await redisClient.zCard(QUEUE_KEY);
    } catch (error) {
      this.logger.error("Failed to get queue size: %o", error instanceof Error ? error : new Error(String(error)));
      return 0;
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

  async tryMatch(io: Namespace): Promise<QueuedUser[] | null> {
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
      const blockedSets = await this.loadBlockedSets(userIds);
      const interestTagsMap = await this.loadInterestTags(userIds);
      const favoritesMap = await this.loadFavorites(userIds);
      const embeddingsMap = await this.loadEmbeddings(userIds);

      const queueUsers: QueueUser[] = [];
      const now = Date.now();

      for (const member of queueMembers) {
        const userId = member.value;
        const socketId = await redisClient.get(`match:socket:${userId}`);

        if (!socketId) {
          await this.dequeue(userId);
          continue;
        }

        const socket = io.sockets.get(socketId);
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

      const embeddingPairs: EmbeddingPair[] = [];
      for (let i = 0; i < queueUsers.length; i++) {
        for (let j = i + 1; j < queueUsers.length; j++) {
          const userA = queueUsers[i]!;
          const userB = queueUsers[j]!;
          embeddingPairs.push({
            userAId: userA.userId,
            userBId: userB.userId,
            embeddingA: embeddingsMap.get(userA.userId) ?? null,
            embeddingB: embeddingsMap.get(userB.userId) ?? null,
          });
        }
      }

      const embeddingSimilarityMap = calculateEmbeddingSimilarities(embeddingPairs);

      const allCandidates: ScoredCandidatePair[] = [];

      for (let i = 0; i < queueUsers.length; i++) {
        for (let j = i + 1; j < queueUsers.length; j++) {
          const userA = queueUsers[i]!;
          const userB = queueUsers[j]!;

          const skipSetA = skipSets.get(userA.userId);
          const skipSetB = skipSets.get(userB.userId);
          const hasSkipCooldown = skipSetA?.has(userB.userId) || skipSetB?.has(userA.userId);

          const blockedSetA = blockedSets.get(userA.userId);
          const blockedSetB = blockedSets.get(userB.userId);
          const isBlocked = blockedSetA?.has(userB.userId) || blockedSetB?.has(userA.userId);

          const favoritesA = favoritesMap.get(userA.userId);
          const favoritesB = favoritesMap.get(userB.userId);

          const favoriteType = calculateFavoriteType(favoritesA, favoritesB, userA.userId, userB.userId);

          const embeddingSimilarity = getEmbeddingSimilarityFromMap(
            embeddingSimilarityMap,
            userA.userId,
            userB.userId
          );

          const { score: baseScore, commonInterests } = calculateRedisCandidateScoreWithEmbedding(
            userA,
            userB,
            now,
            embeddingSimilarity
          );

          let finalScore = baseScore;
          if (favoriteType === "mutual") {
            finalScore += 10000;
          } else if (favoriteType === "one-way") {
            finalScore += 5000;
          }

          const candidate: ScoredCandidatePair = { userA, userB, score: finalScore, commonInterests, favoriteType };

          if (!hasSkipCooldown && !isBlocked) {
            allCandidates.push(candidate);
          }
        }
      }

      if (allCandidates.length === 0 && queueUsers.length >= 2) {

        let bestFallback: ScoredCandidatePair | null = null;
        for (let i = 0; i < queueUsers.length; i++) {
          for (let j = i + 1; j < queueUsers.length; j++) {
            const userA = queueUsers[i]!;
            const userB = queueUsers[j]!;

            const blockedSetA = blockedSets.get(userA.userId);
            const blockedSetB = blockedSets.get(userB.userId);
            const isBlocked = blockedSetA?.has(userB.userId) || blockedSetB?.has(userA.userId);

            if (isBlocked) {
              continue;
            }

            const favoritesA = favoritesMap.get(userA.userId);
            const favoritesB = favoritesMap.get(userB.userId);
            const favoriteType = calculateFavoriteType(favoritesA, favoritesB, userA.userId, userB.userId);

            const embeddingSimilarity = getEmbeddingSimilarityFromMap(
              embeddingSimilarityMap,
              userA.userId,
              userB.userId
            );

            const { score: baseScore, commonInterests } = calculateRedisCandidateScoreWithEmbedding(
              userA,
              userB,
              now,
              embeddingSimilarity
            );

            let finalScore = baseScore;
            if (favoriteType === "mutual") {
              finalScore += 10000;
            } else if (favoriteType === "one-way") {
              finalScore += 5000;
            }

            const candidate: ScoredCandidatePair = { userA, userB, score: finalScore, commonInterests, favoriteType };

            if (!bestFallback || this.compareCandidates(candidate, bestFallback) > 0) {
              bestFallback = candidate;
            }
          }
        }

        if (!bestFallback) {
          return null;
        }

        const socketIdA = await redisClient.get(`match:socket:${bestFallback.userA.userId}`);
        const socketIdB = await redisClient.get(`match:socket:${bestFallback.userB.userId}`);

        if (!socketIdA || !socketIdB) {
          return null;
        }

        const socketA = io.sockets.get(socketIdA);
        const socketB = io.sockets.get(socketIdB);

        if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
          return null;
        }

        await this.dequeue(bestFallback.userA.userId);
        await this.dequeue(bestFallback.userB.userId);

        this.logger.info("Match created (fallback): %s <-> %s", bestFallback.userA.userId, bestFallback.userB.userId);

        return [
          {
            socketId: socketIdA,
            socket: socketA,
            joinedAt: new Date(bestFallback.userA.joinedAt),
          },
          {
            socketId: socketIdB,
            socket: socketB,
            joinedAt: new Date(bestFallback.userB.joinedAt),
          },
        ];
      }

      if (allCandidates.length === 0) {
        return null;
      }

      allCandidates.sort((a, b) => this.compareCandidates(a, b));

      const bestMatch = allCandidates[0];
      if (!bestMatch) {
        return null;
      }

      const socketIdA = await redisClient.get(`match:socket:${bestMatch.userA.userId}`);
      const socketIdB = await redisClient.get(`match:socket:${bestMatch.userB.userId}`);

      if (!socketIdA || !socketIdB) {
        return null;
      }

      const socketA = io.sockets.get(socketIdA);
      const socketB = io.sockets.get(socketIdB);

      if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
        return null;
      }

      await this.dequeue(bestMatch.userA.userId);
      await this.dequeue(bestMatch.userB.userId);

      let matchReason: string;
      if (bestMatch.favoriteType === "mutual") {
        matchReason = "mutual_favorite";
      } else if (bestMatch.favoriteType === "one-way") {
        matchReason = "one_way_favorite";
      } else if (bestMatch.commonInterests > 0) {
        matchReason = "common_interests";
      } else {
        matchReason = "general";
      }

      this.logger.info(
        "Match created: %s <-> %s reason=%s interests=%d",
        bestMatch.userA.userId,
        bestMatch.userB.userId,
        matchReason,
        bestMatch.commonInterests,
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

  async cleanupStaleSockets(io: Namespace): Promise<void> {
    try {
      const queueMembers = await redisClient.zRange(QUEUE_KEY, 0, MAX_MATCHING_CANDIDATES - 1);
      const staleUserIds: string[] = [];

      for (const userId of queueMembers) {
        const socketId = await redisClient.get(`match:socket:${userId}`);
        if (!socketId) {
          staleUserIds.push(userId);
          continue;
        }

        const socket = io.sockets.get(socketId);
        if (!socket || !socket.connected) {
          staleUserIds.push(userId);
        }
      }

      if (staleUserIds.length > 0) {
        for (const userId of staleUserIds) {
          await this.dequeue(userId);
        }
        this.logger.info("Cleaned up stale sockets: count=%d", staleUserIds.length);
      }
    } catch (error) {
      this.logger.error("Failed to cleanup stale sockets: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  async cleanupExpiredEntries(io: Namespace): Promise<void> {
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
            const socket = io.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit("queue-timeout", {
                message: "Queue timeout. Please try again.",
              });
            }
          }
        }
        this.logger.info("Cleaned up expired queue entries: count=%d", expiredUserIds.length);
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired entries: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async cacheUserInterests(dbUserId: string): Promise<void> {
    try {
      const interestTags = await getInterestTags(dbUserId);
      const key = `user:interests:${dbUserId}`;

      await redisClient.del(key);

      if (interestTags.length > 0) {
        await redisClient.sAdd(key, interestTags);
        await redisClient.expire(key, INTEREST_TAGS_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user interests: %s %o",
        dbUserId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async loadInterestTags(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    try {
      const operations = userIds.map(async (userId) => {
        const key = `user:interests:${userId}`;
        const tags = await redisClient.sMembers(key);
        return { userId, tags };
      });

      const results = await Promise.all(operations);

      for (const { userId, tags } of results) {
        result.set(userId, tags);
      }
    } catch (error) {
      this.logger.error("Failed to load interest tags: %o", error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }

  private async loadSkipSets(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      const operations = userIds.map(async (userId) => {
        const skipKey = `match:skip:${userId}`;
        const skippedUserIds = await redisClient.sMembers(skipKey);
        return { userId, skippedUserIds };
      });

      const results = await Promise.all(operations);

      for (const { userId, skippedUserIds } of results) {
        if (skippedUserIds.length > 0) {
          result.set(userId, new Set(skippedUserIds));
        }
      }
    } catch (error) {
      this.logger.error("Failed to load skip sets: %o", error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }

  private async cacheUserFavorites(dbUserId: string): Promise<void> {
    try {
      const favorites = await getFavoritesByUserId(dbUserId);
      const key = `user:favorites:${dbUserId}`;

      await redisClient.del(key);

      if (favorites.length > 0) {
        await redisClient.sAdd(key, favorites);
        await redisClient.expire(key, FAVORITES_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user favorites: %s %o",
        dbUserId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async loadFavorites(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      const operations = userIds.map(async (userId) => {
        const key = `user:favorites:${userId}`;
        const favorites = await redisClient.sMembers(key);
        return { userId, favorites };
      });

      const results = await Promise.all(operations);

      for (const { userId, favorites } of results) {
        if (favorites.length > 0) {
          result.set(userId, new Set(favorites));
        }
      }
    } catch (error) {
      this.logger.error("Failed to load favorites: %o", error instanceof Error ? error : new Error(String(error)));
    }

    return result;
  }

  private async cacheUserBlocks(dbUserId: string): Promise<void> {
    try {
      const blocks = await getBlockedUserIds(dbUserId);
      const key = `user:blocks:${dbUserId}`;

      await redisClient.del(key);

      if (blocks.length > 0) {
        await redisClient.sAdd(key, blocks);
        await redisClient.expire(key, BLOCKS_TTL);
      }
    } catch (error) {
      this.logger.error(
        "Failed to cache user blocks: %s %o",
        dbUserId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async loadBlockedSets(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      const operations = userIds.map(async (userId) => {
        const key = `user:blocks:${userId}`;
        const blockedUserIds = await redisClient.sMembers(key);
        return { userId, blockedUserIds };
      });

      const results = await Promise.all(operations);

      for (const { userId, blockedUserIds } of results) {
        if (blockedUserIds.length > 0) {
          result.set(userId, new Set(blockedUserIds));
        }
      }
    } catch (error) {
      this.logger.error("Failed to load blocked sets: %o", error instanceof Error ? error : new Error(String(error)));
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
      this.logger.error("Failed to acquire lock: %o", error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await redisClient.del(LOCK_KEY);
    } catch (error) {
      this.logger.error("Failed to release lock: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadEmbeddings(userIds: string[]): Promise<Map<string, number[]>> {
    try {
      return await getUserEmbeddingsMap(userIds);
    } catch (error) {
      this.logger.error("Failed to load embeddings: %o", error instanceof Error ? error : new Error(String(error)));
      return new Map();
    }
  }

  private compareCandidates(a: ScoredCandidatePair, b: ScoredCandidatePair): number {
    if (a.favoriteType !== b.favoriteType) {
      const favoriteOrder = { mutual: 3, "one-way": 2, none: 1 };
      return favoriteOrder[a.favoriteType] - favoriteOrder[b.favoriteType];
    }

    if (a.commonInterests !== b.commonInterests) {
      return a.commonInterests - b.commonInterests;
    }

    return a.score - b.score;
  }
}

