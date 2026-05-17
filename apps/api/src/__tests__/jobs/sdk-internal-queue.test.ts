import { describe, expect, it } from "vitest";

import {
  ackJob,
  enqueueJob,
  moveToProcessing,
  pushToDlq,
  reapStrandedProcessingLists,
  refreshHeartbeat,
  type RedisListClient,
} from "@ws/sdk-internal";
import {
  JOB_DLQ_KEY,
  JOB_QUEUE_KEY,
  WORKER_HEARTBEAT_TTL_SECONDS,
  buildProcessingListKey,
  buildWorkerHeartbeatKey,
} from "@ws/shared-types";

type CallEntry =
  | { method: "lPush"; args: [string, string] }
  | { method: "blMove"; args: [string, string, "LEFT" | "RIGHT", "LEFT" | "RIGHT", number] }
  | { method: "lRem"; args: [string, number, string] }
  | { method: "rPopLPush"; args: [string, string] }
  | { method: "setEx"; args: [string, number, string] }
  | { method: "exists"; args: [string] }
  | { method: "del"; args: [string] };

type FakeOptions = {
  blMoveResult?: string | null;
  scanBatches?: string[][];
  heartbeatExists?: Record<string, boolean>;
  rPopLPushQueues?: Record<string, string[]>;
};

function createFakeRedis(opts: FakeOptions = {}): {
  client: RedisListClient;
  calls: CallEntry[];
} {
  const calls: CallEntry[] = [];
  const heartbeats = opts.heartbeatExists ?? {};
  const rPopQueues: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(opts.rPopLPushQueues ?? {})) {
    rPopQueues[k] = [...v];
  }
  const scanBatches = opts.scanBatches ?? [];

  const client: RedisListClient = {
    lPush: async (key, element) => {
      calls.push({ method: "lPush", args: [key, element] });
      return 1;
    },
    brPop: async () => null,
    blMove: async (source, destination, sourceDirection, destinationDirection, timeoutSeconds) => {
      calls.push({
        method: "blMove",
        args: [source, destination, sourceDirection, destinationDirection, timeoutSeconds],
      });
      return opts.blMoveResult ?? null;
    },
    lRem: async (key, count, element) => {
      calls.push({ method: "lRem", args: [key, count, element] });
      return 1;
    },
    rPopLPush: async (source, destination) => {
      calls.push({ method: "rPopLPush", args: [source, destination] });
      const queue = rPopQueues[source];
      if (!queue || queue.length === 0) {
        return null;
      }
      const item = queue.pop() ?? null;
      return item;
    },
    setEx: async (key, seconds, value) => {
      calls.push({ method: "setEx", args: [key, seconds, value] });
      return "OK";
    },
    exists: async (key) => {
      calls.push({ method: "exists", args: [key] });
      return heartbeats[key] ? 1 : 0;
    },
    del: async (key) => {
      calls.push({ method: "del", args: [key] });
      return 1;
    },
    scanIterator: async function* () {
      for (const batch of scanBatches) {
        yield batch;
      }
    },
  };

  return { client, calls };
}

describe("@ws/sdk-internal queue helpers", () => {
  it("enqueueJob LPUSHes to the main queue", async () => {
    const { client, calls } = createFakeRedis();
    await enqueueJob(client, {
      v: 1,
      type: "user_embedding_regenerate",
      payload: { userId: "u1" },
    });
    expect(calls).toEqual([
      {
        method: "lPush",
        args: [
          JOB_QUEUE_KEY,
          JSON.stringify({
            v: 1,
            type: "user_embedding_regenerate",
            payload: { userId: "u1" },
          }),
        ],
      },
    ]);
  });

  it("moveToProcessing BLMOVEs from main to per-worker processing list", async () => {
    const workerId = "worker-A";
    const { client, calls } = createFakeRedis({ blMoveResult: "raw-payload" });
    const result = await moveToProcessing(client, workerId, 5);
    expect(result).toBe("raw-payload");
    expect(calls).toEqual([
      {
        method: "blMove",
        args: [JOB_QUEUE_KEY, buildProcessingListKey(workerId), "RIGHT", "LEFT", 5],
      },
    ]);
  });

  it("ackJob LREMs from the per-worker processing list", async () => {
    const workerId = "worker-B";
    const raw = "{}";
    const { client, calls } = createFakeRedis();
    await ackJob(client, workerId, raw);
    expect(calls).toEqual([
      { method: "lRem", args: [buildProcessingListKey(workerId), 1, raw] },
    ]);
  });

  it("pushToDlq LPUSHes a JSON-encoded entry", async () => {
    const { client, calls } = createFakeRedis();
    await pushToDlq(client, {
      raw: "{}",
      label: "type=apply_call_exp",
      reason: "retries_exhausted",
      attempts: 4,
      failedAt: "2026-05-17T00:00:00.000Z",
      workerId: "worker-C",
      lastStatus: 503,
      errorMessage: "boom",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("lPush");
    expect(calls[0]?.args[0]).toBe(JOB_DLQ_KEY);
    const decoded = JSON.parse(calls[0]?.args[1] as string);
    expect(decoded).toMatchObject({
      raw: "{}",
      label: "type=apply_call_exp",
      reason: "retries_exhausted",
      attempts: 4,
      lastStatus: 503,
      workerId: "worker-C",
    });
  });

  it("refreshHeartbeat SETEXes with the configured TTL", async () => {
    const workerId = "worker-D";
    const { client, calls } = createFakeRedis();
    await refreshHeartbeat(client, workerId);
    expect(calls).toEqual([
      {
        method: "setEx",
        args: [buildWorkerHeartbeatKey(workerId), WORKER_HEARTBEAT_TTL_SECONDS, "1"],
      },
    ]);
  });

  it("reapStrandedProcessingLists requeues from dead workers and skips alive ones and self", async () => {
    const aliveWorker = "alive";
    const deadWorker = "dead";
    const selfWorker = "self";

    const aliveKey = buildProcessingListKey(aliveWorker);
    const deadKey = buildProcessingListKey(deadWorker);
    const selfKey = buildProcessingListKey(selfWorker);

    const { client, calls } = createFakeRedis({
      scanBatches: [[aliveKey, deadKey, selfKey]],
      heartbeatExists: {
        [buildWorkerHeartbeatKey(aliveWorker)]: true,
        [buildWorkerHeartbeatKey(deadWorker)]: false,
      },
      rPopLPushQueues: {
        [deadKey]: ["job-1", "job-2"],
      },
    });

    const result = await reapStrandedProcessingLists(client, { selfWorkerId: selfWorker });

    expect(result).toEqual({ requeued: 2, cleaned: 1 });
    const rPopCalls = calls.filter((c) => c.method === "rPopLPush");
    expect(rPopCalls).toHaveLength(3);
    expect(rPopCalls.every((c) => c.args[0] === deadKey && c.args[1] === JOB_QUEUE_KEY)).toBe(true);

    const delCalls = calls.filter((c) => c.method === "del");
    expect(delCalls).toEqual([{ method: "del", args: [deadKey] }]);

    const existsCalls = calls.filter((c) => c.method === "exists");
    expect(existsCalls.map((c) => c.args[0])).toEqual([
      buildWorkerHeartbeatKey(aliveWorker),
      buildWorkerHeartbeatKey(deadWorker),
    ]);
  });
});
