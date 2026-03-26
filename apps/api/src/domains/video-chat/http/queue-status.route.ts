import { Router, type Request, type Response } from "express";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: Router = Router();
const queueStatusRateLimit = createRateLimitMiddleware({ windowMs: 10_000, maxRequests: 10 });

interface QueueStatusCache {
  queueSize: number;
  estimatedWaitSeconds: number | null;
  cachedAt: number;
}

const CACHE_TTL_MS = 5_000;
let cache: QueueStatusCache | null = null;

function estimateWait(queueSize: number): number | null {
  if (queueSize < 2) return null;
  return Math.max(5, 30 - queueSize * 3);
}

router.get("/queue-status", queueStatusRateLimit, async (_req: Request, res: Response) => {
  const now = Date.now();

  if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
    res.json(cache);
    return;
  }

  const context = getVideoChatContext();
  const queueSize = context ? await context.matchmaking.getQueueSize() : 0;
  const estimatedWaitSeconds = estimateWait(queueSize);

  cache = { queueSize, estimatedWaitSeconds, cachedAt: now };

  res.json({ queueSize, estimatedWaitSeconds });
});

export default router;
