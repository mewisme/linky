import { createServer } from "node:http";

import express from "express";
import { describe, expect, it, vi } from "vitest";

import { INTERNAL_WORKER_GENERAL_JOBS_PATH } from "@ws/internal-worker-api";

import { createInternalWorkerRouter } from "@/routes/internal-worker.route.js";

const executeApplyCallExpJob = vi.fn().mockResolvedValue(undefined);

vi.mock("@/worker/worker-jobs/apply-call-exp.js", () => ({
  executeApplyCallExpJob: (...args: unknown[]) => executeApplyCallExpJob(...args),
}));

vi.mock("@/worker/worker-ai/report-ai-summary.js", () => ({
  executeReportAiSummaryJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/worker/worker-ai/user-embedding-regenerate.js", () => ({
  executeUserEmbeddingRegenerateJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/infra/redis/worker-idempotency.js", () => ({
  tryReserveGeneralJobIdempotency: vi.fn().mockResolvedValue("new"),
  releaseGeneralJobIdempotency: vi.fn().mockResolvedValue(undefined),
}));

const secret = "test-internal-worker-secret-key-min-32-chars";

async function withServer(
  app: express.Application,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    server.close();
    throw new Error("expected socket address");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("internal worker routes", () => {
  it("returns 401 without bearer token for general-jobs", async () => {
    const app = express();
    app.use(express.json());
    app.use(createInternalWorkerRouter());

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}${INTERNAL_WORKER_GENERAL_JOBS_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          v: 1,
          type: "apply_call_exp",
          payload: {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            durationSeconds: 60,
          },
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  it("returns 400 when Idempotency-Key is missing for general-jobs", async () => {
    const app = express();
    app.use(express.json());
    app.use(createInternalWorkerRouter());

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}${INTERNAL_WORKER_GENERAL_JOBS_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          v: 1,
          type: "apply_call_exp",
          payload: {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            durationSeconds: 60,
          },
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  it("runs apply_call_exp when authorized with idempotency key", async () => {
    executeApplyCallExpJob.mockClear();
    const app = express();
    app.use(express.json());
    app.use(createInternalWorkerRouter());

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}${INTERNAL_WORKER_GENERAL_JOBS_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
          "idempotency-key": "a".repeat(64),
        },
        body: JSON.stringify({
          v: 1,
          type: "apply_call_exp",
          payload: {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            durationSeconds: 60,
          },
        }),
      });
      expect(res.status).toBe(204);
      expect(executeApplyCallExpJob).toHaveBeenCalledTimes(1);
    });
  });
});
