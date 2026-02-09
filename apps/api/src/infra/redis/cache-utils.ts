import { getCacheKey, shouldVersionKey } from "@/infra/redis/cache-namespace.js";

import { createLogger } from "@ws/logger";
import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";

const logger = createLogger("infra:redis:cache-utils");


export async function getCachedData<T>(
  key: string,
  fetchFromDb: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cacheKey = shouldVersionKey(key) ? getCacheKey(key) : key;

  try {
    const cached = await withRedisTimeout(
      () => redisClient.get(cacheKey),
      `get-cached-${cacheKey}`
    );
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    logger.warn(`Redis cache read failed for key ${cacheKey}: %o`, error instanceof Error ? error : new Error(String(error)));
  }

  const data = await fetchFromDb();

  if (ttl !== undefined) {
    try {
      await withRedisTimeout(
        () => redisClient.set(cacheKey, JSON.stringify(data), { EX: ttl }),
        `set-cached-${cacheKey}`
      );
    } catch (error) {
      logger.warn(`Failed to cache data for key ${cacheKey}: %o`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return data;
}

export async function invalidateCacheKey(key: string): Promise<void> {
  const cacheKey = shouldVersionKey(key) ? getCacheKey(key) : key;

  try {
    await withRedisTimeout(
      () => redisClient.del(cacheKey),
      `invalidate-${cacheKey}`
    );
  } catch (error) {
    logger.warn(`Failed to invalidate cache for key ${cacheKey}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}

export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const cacheKeys = keys.map(key => shouldVersionKey(key) ? getCacheKey(key) : key);

  try {
    await withRedisTimeout(
      () => redisClient.del(cacheKeys),
      `invalidate-multiple`
    );
  } catch (error) {
    logger.warn(`Failed to invalidate cache for keys ${cacheKeys.join(", ")}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateCachedData<T>(key: string, data: T, ttl?: number): Promise<void> {
  const cacheKey = shouldVersionKey(key) ? getCacheKey(key) : key;

  try {
    await withRedisTimeout(
      () => redisClient.set(cacheKey, JSON.stringify(data), ttl ? { EX: ttl } : undefined),
      `update-cached-${cacheKey}`
    );
  } catch (error) {
    logger.warn(`Failed to update cache for key ${cacheKey}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}