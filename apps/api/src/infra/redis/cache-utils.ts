import { createLogger } from "@repo/logger/api";
import { redisClient } from "./client.js";

const logger = createLogger("API:Redis:CacheUtils");


export async function getCachedData<T>(
  key: string,
  fetchFromDb: () => Promise<T>,
  ttl?: number
): Promise<T> {
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      logger.info(`Cache hit for key: ${key}`);
      return JSON.parse(cached) as T;
    }

    logger.info(`Cache miss for key: ${key}`);
  } catch (error) {
    logger.warn(`Redis cache read failed for key ${key}: %o`, error instanceof Error ? error : new Error(String(error)));
  }

  const data = await fetchFromDb();

  if (ttl !== undefined) {
    try {
      await redisClient.set(key, JSON.stringify(data), { EX: ttl });
      logger.info(`Data cached for key: ${key}`);
    } catch (error) {
      logger.warn(`Failed to cache data for key ${key}: %o`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return data;
}

export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    logger.info(`Cache invalidated for key: ${key}`);
  } catch (error) {
    logger.warn(`Failed to invalidate cache for key ${key}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}

export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    await redisClient.del(keys);
    logger.info(`Cache invalidated for keys: %s`, keys.join(", "));
  } catch (error) {
    logger.warn(`Failed to invalidate cache for keys ${keys.join(", ")}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateCachedData<T>(key: string, data: T, ttl?: number): Promise<void> {
  try {
    await redisClient.set(key, JSON.stringify(data), ttl ? { EX: ttl } : undefined);
    logger.info(`Cache updated for key: ${key}`);
  } catch (error) {
    logger.warn(`Failed to update cache for key ${key}: %o`, error instanceof Error ? error : new Error(String(error)));
  }
}