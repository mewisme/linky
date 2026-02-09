import { getCacheKey, shouldVersionKey } from "@/infra/redis/cache-namespace.js";

import { createLogger } from "@ws/logger";
import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";

const logger = createLogger("infra:redis:cache");
const SCAN_COUNT = 200;
const DELETE_BATCH_SIZE = 500;

function resolveCacheKey(key: string): string {
  return shouldVersionKey(key) ? getCacheKey(key) : key;
}

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFromDb: () => Promise<T>,
): Promise<T> {
  const cacheKey = resolveCacheKey(key);

  try {
    const cached = await withRedisTimeout(() => redisClient.get(cacheKey), `cache-get:${cacheKey}`);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch (error) {
        logger.warn(
          "Cache JSON parse failed for key %s: %o",
          cacheKey,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  } catch (error) {
    logger.warn(
      "Cache read failed for key %s: %o",
      cacheKey,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  const data = await fetchFromDb();

  try {
    await withRedisTimeout(
      () => redisClient.set(cacheKey, JSON.stringify(data), { EX: ttlSeconds }),
      `cache-set:${cacheKey}`,
    );
  } catch (error) {
    logger.warn(
      "Cache write failed for key %s: %o",
      cacheKey,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  return data;
}

export async function invalidate(key: string): Promise<void> {
  const cacheKey = resolveCacheKey(key);
  try {
    await withRedisTimeout(() => redisClient.del(cacheKey), `cache-del:${cacheKey}`);
  } catch (error) {
    logger.warn(
      "Cache invalidate failed for key %s: %o",
      cacheKey,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

export async function invalidateByPrefix(prefix: string): Promise<void> {
  const cachePrefix = resolveCacheKey(prefix);
  const match = `${cachePrefix}*`;

  try {
    const keys: string[] = [];
    for await (const chunk of redisClient.scanIterator({ MATCH: match, COUNT: SCAN_COUNT }) as AsyncIterable<any>) {
      if (Array.isArray(chunk)) {
        keys.push(...(chunk as string[]));
      } else if (typeof chunk === "string") {
        keys.push(chunk);
      }
      if (keys.length >= DELETE_BATCH_SIZE) {
        const batch = keys.splice(0, keys.length);
        await withRedisTimeout(() => (redisClient as any).del(...batch), `cache-del-batch:${cachePrefix}`);
        keys.length = 0;
      }
    }

    if (keys.length > 0) {
      const batch = keys.splice(0, keys.length);
      await withRedisTimeout(() => (redisClient as any).del(...batch), `cache-del-batch:${cachePrefix}`);
    }
  } catch (error) {
    logger.warn(
      "Cache prefix invalidation failed for prefix %s: %o",
      cachePrefix,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

