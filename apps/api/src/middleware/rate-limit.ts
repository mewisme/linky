import { type Request, type Response, type NextFunction } from "express";
import { redisClient } from "../infra/redis/client.js";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger/api";
import { withRedisTimeout } from "../infra/redis/timeout-wrapper.js";

const logger = createLogger("API:Middleware:RateLimit");

export function createRateLimitMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
  const windowMs = options?.windowMs || config.rateLimitWindowMs;
  const maxRequests = options?.maxRequests || config.rateLimitMaxRequests;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!redisClient.isOpen) {
      logger.warn("Redis not available, skipping rate limit");
      return next();
    }

    const identifier = req.auth?.sub || req.ip || "unknown";
    const key = `rate-limit:${identifier}`;

    try {
      const current = await withRedisTimeout(
        async () => {
          const count = await redisClient.incr(key);
          if (count === 1) {
            await redisClient.expire(key, Math.ceil(windowMs / 1000));
          }
          return count;
        },
        "rate-limit-check"
      );

      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current).toString());
      res.setHeader("X-RateLimit-Reset", new Date(Date.now() + windowMs).toISOString());

      if (current > maxRequests) {
        logger.warn("Rate limit exceeded for identifier: %s (count: %d)", identifier, current);
        res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Rate limit check failed: %o", error instanceof Error ? error : new Error(String(error)));
      next();
    }
  };
}

export const rateLimitMiddleware = createRateLimitMiddleware();
