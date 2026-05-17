import { type Request, type Response, type NextFunction } from "express";
import { redisClient } from "@/infra/redis/client.js";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";

const logger = createLogger("middleware:rate-limit");

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  failClosed?: boolean;
}

function sendServiceUnavailable(res: Response): void {
  sendJsonError(
    res,
    503,
    "Service Unavailable",
    um(
      "RATE_LIMIT_UNAVAILABLE",
      "serviceUnavailable",
      "Service unavailable",
    ),
  );
}

export function createRateLimitMiddleware(options?: RateLimitOptions) {
  const windowMs = options?.windowMs || config.rateLimitWindowMs;
  const maxRequests = options?.maxRequests || config.rateLimitMaxRequests;
  const failClosed = options?.failClosed ?? false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!redisClient.isOpen) {
      if (failClosed) {
        logger.warn(
          "Redis not available, failing closed for %s %s",
          req.method,
          req.originalUrl || req.url,
        );
        sendServiceUnavailable(res);
        return;
      }
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
        sendJsonError(
          res,
          429,
          "Too Many Requests",
          um("RATE_LIMIT", "rateLimitExceeded", "Rate limit exceeded. Please try again later."),
        );
        return;
      }

      next();
    } catch (error) {
      logger.error(toLoggableError(error), "Rate limit check failed");
      if (failClosed) {
        sendServiceUnavailable(res);
        return;
      }
      next();
    }
  };
}

export const rateLimitMiddleware = createRateLimitMiddleware();
export const rateLimitMiddlewareFailClosed = createRateLimitMiddleware({ failClosed: true });
