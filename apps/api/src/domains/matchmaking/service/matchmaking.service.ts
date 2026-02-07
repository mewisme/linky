import type { Namespace, Socket } from "socket.io";
import type { QueueUser, ScoredCandidatePair } from "@/domains/matchmaking/types/candidate.types.js";
import type { AuthenticatedSocket } from "@/types/socket/socket-context.types.js";
import type { EmbeddingPair } from "@/domains/matchmaking/types/embedding.types.js";
import type { QueuedUser } from "@/domains/matchmaking/types/matchmaking.types.js";
import type { MatchStateStore } from "@/domains/matchmaking/store/index.js";
import { calculateEmbeddingSimilarities, getEmbeddingSimilarityFromMap } from "./embedding-score.service.js";
import { calculateFavoriteType, calculateRedisCandidateScoreWithEmbedding } from "./scoring.service.js";
import { createLogger } from "@repo/logger";
import { getUserEmbeddingsMap } from "@/infra/supabase/repositories/user-embeddings.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

const LOCK_KEY = "match:lock";
const LOCK_TTL = 2;
const MAX_MATCHING_CANDIDATES = 50;

export class MatchmakingService {
  private readonly logger = createLogger("api:matchmaking:service");
  private matchLock = false;

  constructor(private readonly store: MatchStateStore) {}

  async enqueue(socket: Socket): Promise<boolean> {
    const authSocket = socket as AuthenticatedSocket;
    const clerkUserId = authSocket.data.userId;

    if (!clerkUserId) {
      return false;
    }

    if (!socket.connected) {
      this.logger.debug("Enqueue rejected: socket not connected clerkUserId=%s socketId=%s", clerkUserId, socket.id);
      return false;
    }

    const dbUserId = await getUserIdByClerkId(clerkUserId);
    if (!dbUserId) {
      return false;
    }

    const existingInQueue = await this.store.isInQueue(dbUserId);
    if (!existingInQueue) {
      await this.store.cacheUserData(dbUserId);
    }

    return await this.store.enqueueUser(dbUserId, socket.id, socket);
  }

  async dequeue(userId: string, reason?: string): Promise<boolean> {
    return await this.store.dequeueUser(userId, reason);
  }

  async isInQueue(userId: string): Promise<boolean> {
    return await this.store.isInQueue(userId);
  }

  async getQueueSize(): Promise<number> {
    return await this.store.getQueueSize();
  }

  async recordSkip(skipperUserId: string, skippedUserId: string): Promise<void> {
    await this.store.recordSkip(skipperUserId, skippedUserId);
  }

  async tryMatch(io: Namespace): Promise<QueuedUser[] | null> {
    if (this.matchLock) {
      this.logger.debug("tryMatch: lock held, skipping cycle");
      return null;
    }

    this.matchLock = true;

    try {
      const queueSize = await this.store.getQueueSize();
      if (queueSize < 2) {
        return null;
      }

      const candidateCount = Math.min(queueSize, MAX_MATCHING_CANDIDATES);
      const queueEntries = await this.store.getQueuedUsers(candidateCount);

      if (queueEntries.length < 2) {
        return null;
      }

      const userIds = queueEntries.map((entry) => entry.userId);
      const [interestTagsMap, favoritesMap, blockedSetsMap, embeddingsMap] = await Promise.all([
        this.loadInterestTags(userIds),
        this.loadFavorites(userIds),
        this.loadBlockedSets(userIds),
        this.loadEmbeddings(userIds),
      ]);

      const queueUsers: QueueUser[] = [];
      const socketByUserId = new Map<string, Socket>();
      const socketIdByUserId = new Map<string, string>();
      const staleUserIds: string[] = [];

      for (const entry of queueEntries) {
        const socket = io.sockets.get(entry.socketId);

        if (!socket || !socket.connected) {
          staleUserIds.push(entry.userId);
          continue;
        }

        const interestTags = interestTagsMap.get(entry.userId) || [];

        queueUsers.push({
          userId: entry.userId,
          interestTags,
          joinedAt: entry.joinedAt,
        });

        socketIdByUserId.set(entry.userId, entry.socketId);
        socketByUserId.set(entry.userId, socket);
      }

      if (staleUserIds.length > 0) {
        await Promise.all(staleUserIds.map((userId) => this.store.dequeueUser(userId, "tryMatch:stale")));
      }

      if (queueUsers.length < 2) {
        return null;
      }

      const now = Date.now();
      this.logger.debug(
        "tryMatch: queue snapshot queueSize=%d validUsers=%d stale=%d users=%o",
        queueSize,
        queueUsers.length,
        staleUserIds.length,
        queueUsers.map((u) => ({
          userId: u.userId,
          interests: u.interestTags,
          waitSec: Math.round((now - u.joinedAt) / 1000),
          hasFavorites: (favoritesMap.get(u.userId)?.size ?? 0) > 0,
          hasEmbedding: embeddingsMap.has(u.userId),
        })),
      );

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

      const allCandidates: Array<ScoredCandidatePair & { hasSkipCooldown: boolean }> = [];

      for (let i = 0; i < queueUsers.length; i++) {
        for (let j = i + 1; j < queueUsers.length; j++) {
          const userA = queueUsers[i]!;
          const userB = queueUsers[j]!;

          const hasSkipCooldown = await this.store.hasSkip(userA.userId, userB.userId);

          const blockedSetA = blockedSetsMap.get(userA.userId);
          const blockedSetB = blockedSetsMap.get(userB.userId);
          const isBlocked = blockedSetA?.has(userB.userId) || blockedSetB?.has(userA.userId);

          const favoritesA = favoritesMap.get(userA.userId);
          const favoritesB = favoritesMap.get(userB.userId);

          const favoriteType = calculateFavoriteType(favoritesA, favoritesB, userA.userId, userB.userId);

          const embeddingSimilarity = getEmbeddingSimilarityFromMap(
            embeddingSimilarityMap,
            userA.userId,
            userB.userId
          );

          const { score: baseScore, commonInterests, embeddingScore } = calculateRedisCandidateScoreWithEmbedding(
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

          if (isBlocked) {
            this.logger.debug(
              "tryMatch: pair BLOCKED %s <-> %s",
              userA.userId,
              userB.userId,
            );
            continue;
          }

          this.logger.debug(
            "tryMatch: pair %o",
            {
              userA: userA.userId,
              userB: userB.userId,
              finalScore,
              commonInterests,
              favoriteType,
              embeddingScore,
              hasSkipCooldown,
            },
          );

          const candidate: ScoredCandidatePair & { hasSkipCooldown: boolean } = {
            userA,
            userB,
            score: finalScore,
            commonInterests,
            favoriteType,
            hasSkipCooldown,
          };

          allCandidates.push(candidate);
        }
      }

      if (allCandidates.length === 0) {
        return null;
      }

      this.logger.debug(
        "tryMatch: candidates total=%d sorted=%o",
        allCandidates.length,
        allCandidates.map((c) => ({
          pair: `${c.userA.userId} <-> ${c.userB.userId}`,
          score: c.score,
          common: c.commonInterests,
          fav: c.favoriteType,
          skip: c.hasSkipCooldown,
        })),
      );

      const noSkipCandidates = allCandidates.filter((candidate) => !candidate.hasSkipCooldown);
      const preferredCandidates = noSkipCandidates.length > 0 ? noSkipCandidates : allCandidates;

      if (noSkipCandidates.length === 0) {
        allCandidates.sort((a, b) => this.compareCandidates(a, b));
        const bestFallback = allCandidates[0];

        if (!bestFallback) {
          return null;
        }

        const socketIdA = socketIdByUserId.get(bestFallback.userA.userId);
        const socketIdB = socketIdByUserId.get(bestFallback.userB.userId);

        if (!socketIdA || !socketIdB) {
          return null;
        }

        const socketA = socketByUserId.get(bestFallback.userA.userId);
        const socketB = socketByUserId.get(bestFallback.userB.userId);

        if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
          return null;
        }

        await this.store.dequeueUser(bestFallback.userA.userId, "matched:fallback");
        await this.store.dequeueUser(bestFallback.userB.userId, "matched:fallback");

        let fallbackReason: string;
        if (bestFallback.favoriteType === "mutual") {
          fallbackReason = "mutual_favorite";
        } else if (bestFallback.favoriteType === "one-way") {
          fallbackReason = "one_way_favorite";
        } else if (bestFallback.commonInterests > 0) {
          fallbackReason = "common_interests";
        } else {
          fallbackReason = "general";
        }

        this.logger.info(
          "Match created (fallback): %s <-> %s reason=%s score=%d common=%d candidates=%d",
          bestFallback.userA.userId,
          bestFallback.userB.userId,
          fallbackReason,
          bestFallback.score,
          bestFallback.commonInterests,
          allCandidates.length,
        );

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

      preferredCandidates.sort((a, b) => this.compareCandidates(a, b));

      const bestMatch = preferredCandidates[0];
      if (!bestMatch) {
        return null;
      }

      const socketIdA = socketIdByUserId.get(bestMatch.userA.userId);
      const socketIdB = socketIdByUserId.get(bestMatch.userB.userId);

      if (!socketIdA || !socketIdB) {
        return null;
      }

      const socketA = socketByUserId.get(bestMatch.userA.userId);
      const socketB = socketByUserId.get(bestMatch.userB.userId);

      if (!socketA || !socketB || !socketA.connected || !socketB.connected) {
        return null;
      }

      await this.store.dequeueUser(bestMatch.userA.userId, "matched");
      await this.store.dequeueUser(bestMatch.userB.userId, "matched");

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
        "Match created: %s <-> %s reason=%s score=%d common=%d candidates=%d",
        bestMatch.userA.userId,
        bestMatch.userB.userId,
        matchReason,
        bestMatch.score,
        bestMatch.commonInterests,
        preferredCandidates.length,
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
      this.matchLock = false;
    }
  }

  async removeUser(userId: string): Promise<void> {
    await this.store.dequeueUser(userId, "removeUser");
  }

  async cleanupStaleSockets(io: Namespace): Promise<void> {
    try {
      const queueEntries = await this.store.getQueuedUsers(MAX_MATCHING_CANDIDATES);
      const now = Date.now();

      for (const entry of queueEntries) {
        const aliveTime = now - entry.joinedAt;
        if (aliveTime < 3000) {
          continue;
        }

        const socket = io.sockets.get(entry.socketId);
        if (!socket || !socket.connected) {
          await this.store.dequeueUser(entry.userId, "cleanup:stale-socket");
        }
      }
    } catch (error) {
      this.logger.error("Failed to cleanup stale sockets: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  async cleanupExpiredEntries(io: Namespace): Promise<void> {
    try {
      await this.store.cleanup();

      const queueEntries = await this.store.getQueuedUsers(MAX_MATCHING_CANDIDATES);
      const expiredUserIds: string[] = [];
      const now = Date.now();

      for (const entry of queueEntries) {
        const waitTime = now - entry.joinedAt;
        if (waitTime > 5 * 60 * 1000) {
          expiredUserIds.push(entry.userId);
        }
      }

      if (expiredUserIds.length > 0) {
        for (const userId of expiredUserIds) {
          const socketId = await this.store.getUserSocketId(userId);
          await this.store.dequeueUser(userId, "expired");

          if (socketId) {
            const socket = io.sockets.get(socketId);
            if (socket && socket.connected) {
              socket.emit("queue-timeout", {
                message: "Queue timeout. Please try again.",
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired entries: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadInterestTags(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    try {
      const operations = userIds.map(async (userId) => {
        const tags = await this.store.getUserInterests(userId);
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

  private async loadFavorites(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      const operations = userIds.map(async (userId) => {
        const favorites = await this.store.getUserFavorites(userId);
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

  private async loadBlockedSets(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    try {
      const operations = userIds.map(async (userId) => {
        const blockedUserIds = await this.store.getUserBlocks(userId);
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
      return favoriteOrder[b.favoriteType] - favoriteOrder[a.favoriteType];
    }

    if (a.commonInterests !== b.commonInterests) {
      return b.commonInterests - a.commonInterests;
    }

    return b.score - a.score;
  }
}
