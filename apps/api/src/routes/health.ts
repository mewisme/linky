import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { redisClient } from "../infra/redis/client.js";
import { supabase } from "../infra/supabase/client.js";
import { withRedisTimeout } from "../infra/redis/timeout-wrapper.js";
import { withSupabaseTimeout } from "../infra/supabase/timeout-wrapper.js";

const router: ExpressRouter = Router();

router.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

router.get("/readyz", async (_req: Request, res: Response) => {
  let redisReady = false;
  let supabaseReady = false;

  try {
    if (redisClient.isOpen) {
      await withRedisTimeout(
        () => redisClient.ping(),
        "health-check-redis"
      );
      redisReady = true;
    }
  } catch {
    redisReady = false;
  }

  try {
    await withSupabaseTimeout(
      async () => {
        const { error } = await supabase.from("users").select("id").limit(1);
        if (error) throw error;
      },
      "health-check-supabase"
    );
    supabaseReady = true;
  } catch {
    supabaseReady = false;
  }

  if (redisReady && supabaseReady) {
    return res.status(200).json({
      status: "ready",
      redis: "ok",
      supabase: "ok",
    });
  }

  return res.status(503).json({
    status: "not ready",
    redis: redisReady ? "ok" : "error",
    supabase: supabaseReady ? "ok" : "error",
  });
});

export default router;
