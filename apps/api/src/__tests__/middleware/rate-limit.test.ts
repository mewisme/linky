import express from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";

const redisState: { isOpen: boolean; throwOnIncr: boolean; counts: Map<string, number> } = {
  isOpen: true,
  throwOnIncr: false,
  counts: new Map(),
};

vi.mock("@/infra/redis/client.js", () => ({
  redisClient: {
    get isOpen() {
      return redisState.isOpen;
    },
    incr: async (key: string): Promise<number> => {
      if (redisState.throwOnIncr) {
        throw new Error("redis incr boom");
      }
      const next = (redisState.counts.get(key) ?? 0) + 1;
      redisState.counts.set(key, next);
      return next;
    },
    expire: async () => true,
  },
}));

vi.mock("@/config/index.js", () => ({
  config: {
    rateLimitWindowMs: 30_000,
    rateLimitMaxRequests: 100,
    redisTimeout: 5_000,
  },
}));

const { createRateLimitMiddleware } = await import("../../middleware/rate-limit.js");

function buildApp(middleware: express.RequestHandler): express.Application {
  const app = express();
  app.use((req, _res, next) => {
    (req as express.Request & { auth?: { sub: string } }).auth = { sub: "user_test" };
    next();
  });
  app.get("/protected", middleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

async function callRoute(app: express.Application): Promise<{ status: number; body: unknown }> {
  return await new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("expected socket address"));
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${addr.port}/protected`);
        const body = await res.json().catch(() => null);
        server.close(() => resolve({ status: res.status, body }));
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

describe("createRateLimitMiddleware", () => {
  beforeEach(() => {
    redisState.isOpen = true;
    redisState.throwOnIncr = false;
    redisState.counts.clear();
  });

  describe("default (failClosed: false)", () => {
    it("passes through and lets the route respond when Redis is connected", async () => {
      const app = buildApp(createRateLimitMiddleware({ maxRequests: 5 }));
      const res = await callRoute(app);
      expect(res.status).toBe(200);
    });

    it("returns 429 once limit is exceeded", async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1 });
      const app = buildApp(middleware);
      const first = await callRoute(app);
      const second = await callRoute(app);
      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
    });

    it("falls open (200) when Redis is disconnected", async () => {
      redisState.isOpen = false;
      const app = buildApp(createRateLimitMiddleware({ maxRequests: 1 }));
      const res = await callRoute(app);
      expect(res.status).toBe(200);
    });

    it("falls open (200) when Redis throws during the rate-limit check", async () => {
      redisState.throwOnIncr = true;
      const app = buildApp(createRateLimitMiddleware({ maxRequests: 1 }));
      const res = await callRoute(app);
      expect(res.status).toBe(200);
    });
  });

  describe("failClosed: true", () => {
    it("returns 503 when Redis is disconnected", async () => {
      redisState.isOpen = false;
      const app = buildApp(createRateLimitMiddleware({ maxRequests: 1, failClosed: true }));
      const res = await callRoute(app);
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({
        userMessage: { code: "RATE_LIMIT_UNAVAILABLE" },
      });
    });

    it("returns 503 when Redis throws during the rate-limit check", async () => {
      redisState.throwOnIncr = true;
      const app = buildApp(createRateLimitMiddleware({ maxRequests: 1, failClosed: true }));
      const res = await callRoute(app);
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({
        userMessage: { code: "RATE_LIMIT_UNAVAILABLE" },
      });
    });

    it("still rate-limits with 429 when Redis is healthy", async () => {
      const middleware = createRateLimitMiddleware({ maxRequests: 1, failClosed: true });
      const app = buildApp(middleware);
      const first = await callRoute(app);
      const second = await callRoute(app);
      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
    });
  });
});
