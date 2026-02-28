import type { MatchStateStore, QueueEntry } from "./match-state-store.interface.js";

import type { Socket } from "socket.io";
import { createLogger } from "@/utils/logger.js";
import { getBlockedUserIds } from "@/infra/supabase/repositories/user-blocks.js";
import { getFavoritesByUserId } from "@/infra/supabase/repositories/favorites.js";
import { getInterestTags } from "@/infra/supabase/repositories/user-details.js";

const SKIP_COOLDOWN_TTL = 10 * 1000;
const MAX_QUEUE_WAIT_TIME = 5 * 60 * 1000;
const INTEREST_TAGS_TTL = 15 * 60 * 1000;
const FAVORITES_TTL = 10 * 60 * 1000;
const BLOCKS_TTL = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 30 * 1000;

interface SocketEntry {
  socketId: string;
  lastSeen: number;
}

interface CachedData {
  data: string[];
  expiresAt: number;
}

interface SkipEntry {
  skippedUserId: string;
  expiresAt: number;
}

export class MemoryMatchStateStore implements MatchStateStore {
  private queue = new Map<string, QueueEntry>();
  private socketMap = new Map<string, SocketEntry>();
  private skipMap = new Map<string, SkipEntry[]>();
  private interestsCache = new Map<string, CachedData>();
  private favoritesCache = new Map<string, CachedData>();
  private blocksCache = new Map<string, CachedData>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly logger = createLogger("api:matchmaking:memory:store");

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, CLEANUP_INTERVAL);
  }

  async enqueueUser(userId: string, socketId: string, socket: Socket): Promise<boolean> {
    if (!socket.connected) {
      this.logger.warn("Enqueue rejected: socket not connected userId=%s socketId=%s", userId, socketId);
      return false;
    }

    const existingEntry = this.queue.get(userId);
    if (existingEntry) {
      const previousSocketId = existingEntry.socketId;
      if (existingEntry.socketId === socketId) {
        this.logger.info("Enqueue idempotent: already enqueued userId=%s socketId=%s", userId, socketId);
        return true;
      }

      this.socketMap.set(userId, {
        socketId,
        lastSeen: Date.now(),
      });
      existingEntry.socketId = socketId;
      existingEntry.joinedAt = Date.now();
      this.logger.info("Enqueue socket update: userId=%s oldSocket=%s newSocket=%s", userId, previousSocketId, socketId);
      return true;
    }

    const now = Date.now();
    this.queue.set(userId, {
      userId,
      socketId,
      joinedAt: now,
    });

    this.socketMap.set(userId, {
      socketId,
      lastSeen: now,
    });

    this.logger.info("Enqueued user: userId=%s socketId=%s", userId, socketId);
    return true;
  }

  async dequeueUser(userId: string, reason?: string): Promise<boolean> {
    const existed = this.queue.has(userId);
    const socketEntry = this.socketMap.get(userId);
    const socketId = socketEntry?.socketId || "none";

    this.queue.delete(userId);
    this.socketMap.delete(userId);

    if (existed) {
      this.logger.info("Dequeued user: userId=%s socketId=%s reason=%s", userId, socketId, reason || "unspecified");
    }

    return existed;
  }

  async dequeueUserIfOwner(userId: string, socketId: string, reason?: string): Promise<boolean> {
    const currentSocketId = this.socketMap.get(userId)?.socketId;
    if (currentSocketId !== socketId) {
      return false;
    }
    return await this.dequeueUser(userId, reason);
  }

  async getQueuedUsers(limit?: number): Promise<QueueEntry[]> {
    const entries = Array.from(this.queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    return limit ? entries.slice(0, limit) : entries;
  }

  async getUserSocketId(userId: string): Promise<string | null> {
    const entry = this.socketMap.get(userId);
    return entry?.socketId || null;
  }

  async isQueueOwner(userId: string, socketId: string): Promise<boolean> {
    const entry = this.socketMap.get(userId);
    return entry?.socketId === socketId;
  }

  async setUserSocketId(userId: string, socketId: string, socket: Socket): Promise<void> {
    if (!socket.connected) {
      this.logger.warn("setUserSocketId rejected: socket not connected userId=%s socketId=%s", userId, socketId);
      return;
    }

    this.socketMap.set(userId, {
      socketId,
      lastSeen: Date.now(),
    });
  }

  async removeUserSocket(userId: string): Promise<void> {
    this.socketMap.delete(userId);
    await this.dequeueUser(userId, "socket-removed");
  }

  async recordSkip(skipperUserId: string, skippedUserId: string): Promise<void> {
    const existing = this.skipMap.get(skipperUserId) || [];
    const filtered = existing.filter((entry) => entry.expiresAt > Date.now());

    filtered.push({
      skippedUserId,
      expiresAt: Date.now() + SKIP_COOLDOWN_TTL,
    });

    this.skipMap.set(skipperUserId, filtered);
  }

  async hasSkip(userAId: string, userBId: string): Promise<boolean> {
    const now = Date.now();

    const skipsA = this.skipMap.get(userAId) || [];
    const hasAtoB = skipsA.some((entry) => entry.skippedUserId === userBId && entry.expiresAt > now);

    if (hasAtoB) {
      return true;
    }

    const skipsB = this.skipMap.get(userBId) || [];
    const hasBtoA = skipsB.some((entry) => entry.skippedUserId === userAId && entry.expiresAt > now);

    return hasBtoA;
  }

  async getQueueSize(): Promise<number> {
    return this.queue.size;
  }

  async isInQueue(userId: string): Promise<boolean> {
    return this.queue.has(userId);
  }

  async cacheUserData(userId: string): Promise<void> {
    const now = Date.now();

    try {
      const interests = await getInterestTags(userId);
      this.interestsCache.set(userId, {
        data: interests,
        expiresAt: now + INTEREST_TAGS_TTL,
      });
    } catch (error) {
      this.logger.error(error as Error, "Failed to cache interests for %s", userId);
    }

    try {
      const favorites = await getFavoritesByUserId(userId);
      this.favoritesCache.set(userId, {
        data: favorites,
        expiresAt: now + FAVORITES_TTL,
      });
    } catch (error) {
      this.logger.error(error as Error, "Failed to cache favorites for %s", userId);
    }

    try {
      const blocks = await getBlockedUserIds(userId);
      this.blocksCache.set(userId, {
        data: blocks,
        expiresAt: now + BLOCKS_TTL,
      });
    } catch (error) {
      this.logger.error(error as Error, "Failed to cache blocks for %s", userId);
    }
  }

  async getUserInterests(userId: string): Promise<string[]> {
    const cached = this.interestsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return [];
  }

  async getUserFavorites(userId: string): Promise<string[]> {
    const cached = this.favoritesCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return [];
  }

  async getUserBlocks(userId: string): Promise<string[]> {
    const cached = this.blocksCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return [];
  }

  async cleanup(): Promise<void> {
    this.cleanupExpiredEntries();
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [userId, entry] of this.queue.entries()) {
      const age = now - entry.joinedAt;
      if (age > MAX_QUEUE_WAIT_TIME) {
        this.queue.delete(userId);
        this.socketMap.delete(userId);
        this.logger.info("Cleanup: removed expired queue entry userId=%s age=%dms", userId, age);
      }
    }

    for (const [userId, skips] of this.skipMap.entries()) {
      const validSkips = skips.filter((entry) => entry.expiresAt > now);
      if (validSkips.length === 0) {
        this.skipMap.delete(userId);
      } else if (validSkips.length !== skips.length) {
        this.skipMap.set(userId, validSkips);
      }
    }

    for (const [userId, cached] of this.interestsCache.entries()) {
      if (cached.expiresAt <= now) {
        this.interestsCache.delete(userId);
      }
    }

    for (const [userId, cached] of this.favoritesCache.entries()) {
      if (cached.expiresAt <= now) {
        this.favoritesCache.delete(userId);
      }
    }

    for (const [userId, cached] of this.blocksCache.entries()) {
      if (cached.expiresAt <= now) {
        this.blocksCache.delete(userId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.queue.clear();
    this.socketMap.clear();
    this.skipMap.clear();
    this.interestsCache.clear();
    this.favoritesCache.clear();
    this.blocksCache.clear();
  }
}
