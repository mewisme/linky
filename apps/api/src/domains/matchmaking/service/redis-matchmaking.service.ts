import type { Namespace, Socket } from "socket.io";
import type { QueueUser, ScoredCandidatePair } from "../types/candidate.types.js";
import { calculateFavoriteType, calculateRedisCandidateScore } from "./scoring.service.js";

import type { AuthenticatedSocket } from "../../../types/socket/socket-context.types.js";
import type { QueuedUser } from "../types/matchmaking.types.js";
import { createLogger } from "@repo/logger/api";
import { getFavoritesByUserId } from "../../../infra/supabase/repositories/favorites.js";
import { getInterestTags } from "../../../infra/supabase/repositories/user-details.js";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { redisClient } from "../../../infra/redis/client.js";

const QUEUE_KEY = "match:queue";
const LOCK_KEY = "match:lock";
const LOCK_TTL = 2;
const INTEREST_TAGS_TTL = 15 * 60;
const FAVORITES_TTL = 10 * 60;
const SKIP_COOLDOWN_TTL = 10;
const MAX_QUEUE_WAIT_TIME = 5 * 60 * 1000;
const MAX_MATCHING_CANDIDATES = 50;

export class RedisMatchmakingService {
  private readonly logger = createLogger("API:Matchmaking:Redis:Service");

  async enqueue(socket: Socket): Promise<boolean> {
    const socketId = socket.id;
    const authSocket = socket as AuthenticatedSocket;
    const clerkUserId = authSocket.data.userId;

    this.logger.info("[ENQUEUE] Attempting to enqueue socket: %s, clerkUserId: %s", socketId, clerkUserId || "none");

    if (!clerkUserId) {
      this.logger.warn("[ENQUEUE] Cannot enqueue user without Clerk ID: %s", socketId);
      return false;
    }

    try {
      const dbUserId = await getUserIdByClerkId(clerkUserId);
      if (!dbUserId) {
        this.logger.warn("[ENQUEUE] Cannot enqueue user without database ID: %s Clerk ID: %s", socketId, clerkUserId);
        return false;
      }

      this.logger.info("[ENQUEUE] Resolved dbUserId: %s for socket: %s", dbUserId, socketId);

      const existingScore = await redisClient.zScore(QUEUE_KEY, dbUserId);
      if (existingScore !== null) {
        await redisClient.set(`match:socket:${dbUserId}`, socketId, {
          EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
        });
        const queueSize = await this.getQueueSize();
        this.logger.info("[ENQUEUE] User already in queue, updated socket: %s %s (Queue size: %d)", dbUserId, socketId, queueSize);
        return true;
      }

      await this.cacheUserInterests(dbUserId);
      await this.cacheUserFavorites(dbUserId);

      const now = Date.now();
      await redisClient.zAdd(QUEUE_KEY, {
        score: now,
        value: dbUserId,
      });

      await redisClient.set(`match:socket:${dbUserId}`, socketId, {
        EX: MAX_QUEUE_WAIT_TIME / 1000 + 60,
      });

      const queueSize = await this.getQueueSize();
      this.logger.info("[ENQUEUE] User added to queue: %s socket: %s (Queue size: %d)", dbUserId, socketId, queueSize);

      return true;
    } catch (error) {
      this.logger.error("[ENQUEUE] Failed to enqueue user: %s %o", socketId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dequeue(userId: string): Promise<boolean> {
    this.logger.info("[DEQUEUE] Attempting to dequeue user: %s", userId);
    try {
      const removed = await redisClient.zRem(QUEUE_KEY, userId);
      await redisClient.del(`match:socket:${userId}`);

      if (removed > 0) {
        const queueSize = await this.getQueueSize();
        this.logger.info("[DEQUEUE] User removed from queue: %s (Queue size: %d)", userId, queueSize);
        return true;
      }

      this.logger.info("[DEQUEUE] User not in queue: %s", userId);
      return false;
    } catch (error) {
      this.logger.error("[DEQUEUE] Failed to dequeue user: %s %o", userId, error instanceof Error ? error : new Error(String(error)));
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

      this.logger.info("Skip recorded: %s -> %s (Cooldown: %ds)", skipperUserId, skippedUserId, SKIP_COOLDOWN_TTL);
    } catch (error) {
      this.logger.error(
        "Failed to record skip: %s -> %s %o",
        skipperUserId,
        skippedUserId,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async tryMatch(io: Namespace): Promise<QueuedUser[] | null> {
    this.logger.info("[MATCH] tryMatch started");
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      this.logger.warn("[MATCH] Failed to acquire lock, another matcher is running");
      return null;
    }

    try {
      const queueSize = await this.getQueueSize();
      this.logger.info("[MATCH] Queue size: %d", queueSize);
      if (queueSize < 2) {
        this.logger.info("[MATCH] Queue size < 2, no match possible");
        return null;
      }

      const candidateCount = Math.min(queueSize, MAX_MATCHING_CANDIDATES);
      const queueMembers = await redisClient.zRangeWithScores(QUEUE_KEY, 0, candidateCount - 1);
      this.logger.info("[MATCH] Retrieved %d queue members", queueMembers.length);

      if (queueMembers.length < 2) {
        this.logger.info("[MATCH] Queue members < 2 after retrieval");
        return null;
      }

      const userIds = queueMembers.map((m) => m.value);
      const skipSets = await this.loadSkipSets(userIds);
      const interestTagsMap = await this.loadInterestTags(userIds);
      const favoritesMap = await this.loadFavorites(userIds);

      const queueUsers: QueueUser[] = [];
      const now = Date.now();

      for (const member of queueMembers) {
        const userId = member.value;
        const socketId = await redisClient.get(`match:socket:${userId}`);

        if (!socketId) {
          this.logger.warn("[MATCH] No socket ID for user %s, dequeuing", userId);
          await this.dequeue(userId);
          continue;
        }

        const socket = io.sockets.get(socketId);
        if (!socket || !socket.connected) {
          this.logger.warn("[MATCH] Socket %s not found or disconnected for user %s, dequeuing", socketId, userId);
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

      this.logger.info("[MATCH] Valid queue users: %d", queueUsers.length);
      if (queueUsers.length < 2) {
        this.logger.info("[MATCH] Valid queue users < 2 after socket validation");
        return null;
      }

      const isForcedFallbackScenario = queueUsers.length === 2;
      this.logger.info("[MATCH] Forced fallback scenario: %s", isForcedFallbackScenario);

      const favoriteMatches: ScoredCandidatePair[] = [];
      const interestMatches: ScoredCandidatePair[] = [];
      const fallbackMatches: ScoredCandidatePair[] = [];

      for (let i = 0; i < queueUsers.length; i++) {
        for (let j = i + 1; j < queueUsers.length; j++) {
          const userA = queueUsers[i]!;
          const userB = queueUsers[j]!;

          const skipSetA = skipSets.get(userA.userId);
          const skipSetB = skipSets.get(userB.userId);
          const hasSkipCooldown = skipSetA?.has(userB.userId) || skipSetB?.has(userA.userId);

          if (hasSkipCooldown) {
            this.logger.info("[MATCH] Skip cooldown detected: %s <-> %s", userA.userId, userB.userId);
            if (!isForcedFallbackScenario) {
              continue;
            }
            this.logger.info("[MATCH] Forced fallback: ignoring skip cooldown for 2-user scenario");
          }

          const favoritesA = favoritesMap.get(userA.userId);
          const favoritesB = favoritesMap.get(userB.userId);

          const favoriteType = calculateFavoriteType(favoritesA, favoritesB, userA.userId, userB.userId);

          const { score, commonInterests } = calculateRedisCandidateScore(userA, userB, now);

          const candidate: ScoredCandidatePair = { userA, userB, score, commonInterests, favoriteType };

          this.logger.info(
            "[MATCH] Candidate: %s <-> %s (score: %s, interests: %d, favorite: %s, skip: %s)",
            userA.userId,
            userB.userId,
            score.toFixed(2),
            commonInterests,
            favoriteType,
            hasSkipCooldown ? "yes" : "no",
          );

          if (favoriteType !== "none") {
            favoriteMatches.push(candidate);
          } else if (commonInterests > 0) {
            interestMatches.push(candidate);
          } else {
            fallbackMatches.push(candidate);
          }
        }
      }

      let candidates: ScoredCandidatePair[];

      if (favoriteMatches.length > 0) {
        candidates = favoriteMatches;
        this.logger.info("[MATCH] Using favorite matches: %d", favoriteMatches.length);
      } else if (interestMatches.length > 0) {
        candidates = interestMatches;
        this.logger.info("[MATCH] Using interest matches: %d", interestMatches.length);
      } else {
        candidates = fallbackMatches;
        this.logger.info("[MATCH] Using fallback matches: %d", fallbackMatches.length);
      }

      if (candidates.length === 0) {
        if (isForcedFallbackScenario && queueUsers.length === 2) {
          this.logger.info("[MATCH] Forced fallback: creating match for exactly 2 users");
          const userA = queueUsers[0]!;
          const userB = queueUsers[1]!;

          const socketIdA = await redisClient.get(`match:socket:${userA.userId}`);
          const socketIdB = await redisClient.get(`match:socket:${userB.userId}`);

          if (!socketIdA || !socketIdB) {
            this.logger.warn("[MATCH] Forced fallback: missing socket IDs");
            return null;
          }

          const socketA = io.sockets.get(socketIdA);
          const socketB = io.sockets.get(socketIdB);

          if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
            this.logger.warn("[MATCH] Forced fallback: sockets not connected");
            return null;
          }

          await this.dequeue(userA.userId);
          await this.dequeue(userB.userId);

          this.logger.info("[MATCH] Forced fallback match: %s <-> %s", userA.userId, userB.userId);

          return [
            {
              socketId: socketIdA,
              socket: socketA,
              joinedAt: new Date(userA.joinedAt),
            },
            {
              socketId: socketIdB,
              socket: socketB,
              joinedAt: new Date(userB.joinedAt),
            },
          ];
        }
        this.logger.warn("[MATCH] No candidates found");
        return null;
      }

      candidates.sort((a, b) => {
        if (a.favoriteType === "mutual" && b.favoriteType !== "mutual") {
          return -1;
        }
        if (b.favoriteType === "mutual" && a.favoriteType !== "mutual") {
          return 1;
        }
        if (a.favoriteType === "one-way" && b.favoriteType === "none") {
          return -1;
        }
        if (b.favoriteType === "one-way" && a.favoriteType === "none") {
          return 1;
        }
        if (a.commonInterests !== b.commonInterests) {
          return b.commonInterests - a.commonInterests;
        }
        return b.score - a.score;
      });

      const bestMatch = candidates[0];
      if (!bestMatch) {
        this.logger.warn("[MATCH] No best match after sorting");
        return null;
      }

      const socketIdA = await redisClient.get(`match:socket:${bestMatch.userA.userId}`);
      const socketIdB = await redisClient.get(`match:socket:${bestMatch.userB.userId}`);

      if (!socketIdA || !socketIdB) {
        this.logger.warn("[MATCH] Missing socket IDs for best match");
        return null;
      }

      const socketA = io.sockets.get(socketIdA);
      const socketB = io.sockets.get(socketIdB);

      if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
        this.logger.warn("[MATCH] Sockets not connected for best match");
        return null;
      }

      await this.dequeue(bestMatch.userA.userId);
      await this.dequeue(bestMatch.userB.userId);

      this.logger.info(
        "[MATCH] Matched users: %s and %s (Score: %s, Common interests: %d, Favorite: %s)",
        bestMatch.userA.userId,
        bestMatch.userB.userId,
        bestMatch.score.toFixed(2),
        bestMatch.commonInterests,
        bestMatch.favoriteType,
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
      this.logger.info("[MATCH] tryMatch completed, lock released");
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
        this.logger.info("Cleaned up %d stale socket references", staleUserIds.length);
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
        this.logger.info("Cleaned up %d expired queue entries", expiredUserIds.length);
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
      for (const userId of userIds) {
        const key = `user:interests:${userId}`;
        const tags = await redisClient.sMembers(key);
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
      for (const userId of userIds) {
        const skipKey = `match:skip:${userId}`;
        const skippedUserIds = await redisClient.sMembers(skipKey);
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
      for (const userId of userIds) {
        const key = `user:favorites:${userId}`;
        const favorites = await redisClient.sMembers(key);
        if (favorites.length > 0) {
          result.set(userId, new Set(favorites));
        }
      }
    } catch (error) {
      this.logger.error("Failed to load favorites: %o", error instanceof Error ? error : new Error(String(error)));
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
}

