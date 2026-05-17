import { describe, expect, it, vi, beforeEach } from "vitest";

import type { RedisListClient } from "@ws/sdk-internal";
import {
  JOB_DLQ_KEY,
  buildProcessingListKey,
  type JobEnvelope,
} from "@ws/shared-types";
import type { Logger } from "@ws/logger";

import { runJobLoop } from "../run-job-loop.js";

const internalClientMocks = vi.hoisted(() => ({
  postEnvelopeToInternalApi: vi.fn(),
}));

vi.mock("../../api/internal-client.js", () => ({
  postEnvelopeToInternalApi: internalClientMocks.postEnvelopeToInternalApi,
}));

type CallEntry = { method: keyof RedisListClient | "scanIterator"; args: unknown[] };

function createFakeRedis(opts: { incoming?: (string | null)[] } = {}): {
  client: RedisListClient;
  calls: CallEntry[];
  pushedJobs: string[];
} {
  const incoming = [...(opts.incoming ?? [])];
  const calls: CallEntry[] = [];
  const pushedJobs: string[] = [];

  const client: RedisListClient = {
    lPush: async (key, element) => {
      calls.push({ method: "lPush", args: [key, element] });
      pushedJobs.push(`${key}::${element}`);
      return 1;
    },
    brPop: async () => null,
    blMove: async (...args) => {
      calls.push({ method: "blMove", args });
      const next = incoming.shift();
      return next ?? null;
    },
    lRem: async (...args) => {
      calls.push({ method: "lRem", args });
      return 1;
    },
    rPopLPush: async (...args) => {
      calls.push({ method: "rPopLPush", args });
      return null;
    },
    setEx: async (...args) => {
      calls.push({ method: "setEx", args });
      return "OK";
    },
    exists: async (...args) => {
      calls.push({ method: "exists", args });
      return 0;
    },
    del: async (...args) => {
      calls.push({ method: "del", args });
      return 1;
    },
    scanIterator: async function* () {
      // not used by run-job-loop
    },
  };

  return { client, calls, pushedJobs };
}

function silentLogger(): Logger {
  return {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  } as unknown as Logger;
}

const validEnvelope: JobEnvelope = {
  v: 1,
  type: "user_embedding_regenerate",
  payload: { userId: "550e8400-e29b-41d4-a716-446655440000" },
};
const validRaw = JSON.stringify(validEnvelope);

const env = {
  internalApiBaseUrl: "http://api:7270",
  internalApiSocketPath: "",
  internalApiTimeoutMs: 5000,
  internalApiMaxRetries: 0,
  internalApiRetryBaseDelayMs: 100,
} as unknown as Parameters<typeof runJobLoop>[0]["env"];

function makeStopAfter(jobs: number): () => boolean {
  let calls = 0;
  // Each iteration calls isStopping twice (while header + post-dequeue check).
  // We allow `2 * jobs` false answers, then return true forever after.
  return () => {
    const limit = 2 * jobs;
    if (calls < limit) {
      calls++;
      return false;
    }
    return true;
  };
}

beforeEach(() => {
  internalClientMocks.postEnvelopeToInternalApi.mockReset();
});

describe("runJobLoop", () => {
  it("acks on success", async () => {
    const workerId = "worker-success";
    const { client, calls, pushedJobs } = createFakeRedis({ incoming: [validRaw] });
    internalClientMocks.postEnvelopeToInternalApi.mockResolvedValueOnce({ ok: true, attempts: 1 });

    await runJobLoop({
      client,
      env,
      logger: silentLogger(),
      workerId,
      isStopping: makeStopAfter(1),
      parse: (raw) => ({ ok: true as const, data: JSON.parse(raw) as JobEnvelope }),
    });

    const lRemCalls = calls.filter((c) => c.method === "lRem");
    expect(lRemCalls).toHaveLength(1);
    expect(lRemCalls[0]?.args).toEqual([buildProcessingListKey(workerId), 1, validRaw]);
    expect(pushedJobs).toEqual([]);
  });

  it("pushes to DLQ on dropped result and acks", async () => {
    const workerId = "worker-dropped";
    const { client, calls, pushedJobs } = createFakeRedis({ incoming: [validRaw] });
    internalClientMocks.postEnvelopeToInternalApi.mockResolvedValueOnce({
      ok: false,
      dropped: true,
      attempts: 1,
      lastStatus: 400,
      errorMessage: "ValidationError: bad",
    });

    await runJobLoop({
      client,
      env,
      logger: silentLogger(),
      workerId,
      isStopping: makeStopAfter(1),
      parse: (raw) => ({ ok: true as const, data: JSON.parse(raw) as JobEnvelope }),
    });

    expect(pushedJobs).toHaveLength(1);
    const decoded = JSON.parse(pushedJobs[0]!.split("::")[1]!);
    expect(pushedJobs[0]!.startsWith(`${JOB_DLQ_KEY}::`)).toBe(true);
    expect(decoded).toMatchObject({
      reason: "dropped",
      lastStatus: 400,
      attempts: 1,
      workerId,
      raw: validRaw,
    });

    const lRemCalls = calls.filter((c) => c.method === "lRem");
    expect(lRemCalls).toHaveLength(1);
  });

  it("pushes to DLQ on retries-exhausted and acks", async () => {
    const workerId = "worker-retries";
    const { client, calls, pushedJobs } = createFakeRedis({ incoming: [validRaw] });
    internalClientMocks.postEnvelopeToInternalApi.mockResolvedValueOnce({
      ok: false,
      dropped: false,
      attempts: 4,
      lastStatus: 503,
      errorMessage: "upstream",
    });

    await runJobLoop({
      client,
      env,
      logger: silentLogger(),
      workerId,
      isStopping: makeStopAfter(1),
      parse: (raw) => ({ ok: true as const, data: JSON.parse(raw) as JobEnvelope }),
    });

    expect(pushedJobs).toHaveLength(1);
    const decoded = JSON.parse(pushedJobs[0]!.split("::")[1]!);
    expect(decoded).toMatchObject({
      reason: "retries_exhausted",
      lastStatus: 503,
      attempts: 4,
      workerId,
    });

    expect(calls.filter((c) => c.method === "lRem")).toHaveLength(1);
  });

  it("DLQs unparseable payloads", async () => {
    const workerId = "worker-bad";
    const { client, calls, pushedJobs } = createFakeRedis({ incoming: ["not-json"] });

    await runJobLoop({
      client,
      env,
      logger: silentLogger(),
      workerId,
      isStopping: makeStopAfter(1),
      parse: () => ({ ok: false as const, error: "invalid" }),
    });

    expect(internalClientMocks.postEnvelopeToInternalApi).not.toHaveBeenCalled();
    expect(pushedJobs).toHaveLength(1);
    const decoded = JSON.parse(pushedJobs[0]!.split("::")[1]!);
    expect(decoded).toMatchObject({ reason: "dropped", workerId, raw: "not-json" });
    expect(calls.filter((c) => c.method === "lRem")).toHaveLength(1);
  });

  it("DLQs panics from the internal client and acks", async () => {
    const workerId = "worker-panic";
    const { client, calls, pushedJobs } = createFakeRedis({ incoming: [validRaw] });
    internalClientMocks.postEnvelopeToInternalApi.mockRejectedValueOnce(new Error("boom"));

    await runJobLoop({
      client,
      env,
      logger: silentLogger(),
      workerId,
      isStopping: makeStopAfter(1),
      parse: (raw) => ({ ok: true as const, data: JSON.parse(raw) as JobEnvelope }),
    });

    expect(pushedJobs).toHaveLength(1);
    const decoded = JSON.parse(pushedJobs[0]!.split("::")[1]!);
    expect(decoded).toMatchObject({ reason: "panic", workerId, errorMessage: "boom" });
    expect(calls.filter((c) => c.method === "lRem")).toHaveLength(1);
  });
});
