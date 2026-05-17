import { describe, expect, it } from "vitest";

import {
  reapStrandedProcessingLists,
  type RedisListClient,
} from "@ws/sdk-internal";
import {
  JOB_QUEUE_KEY,
  buildProcessingListKey,
  buildWorkerHeartbeatKey,
} from "@ws/shared-types";

function createInMemoryRedis(initial: {
  lists?: Record<string, string[]>;
  alive?: string[];
}): RedisListClient {
  const lists: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(initial.lists ?? {})) {
    lists[k] = [...v];
  }
  const alive = new Set(initial.alive ?? []);

  return {
    lPush: async (key, element) => {
      lists[key] = lists[key] ?? [];
      lists[key]!.unshift(element);
      return lists[key]!.length;
    },
    brPop: async () => null,
    blMove: async () => null,
    lRem: async (key, _count, element) => {
      const arr = lists[key];
      if (!arr) return 0;
      const idx = arr.indexOf(element);
      if (idx < 0) return 0;
      arr.splice(idx, 1);
      return 1;
    },
    rPopLPush: async (source, destination) => {
      const src = lists[source];
      if (!src || src.length === 0) {
        return null;
      }
      const value = src.pop()!;
      lists[destination] = lists[destination] ?? [];
      lists[destination]!.unshift(value);
      return value;
    },
    setEx: async () => "OK",
    exists: async (key) => (alive.has(key) ? 1 : 0),
    del: async (key) => {
      if (key in lists) {
        delete lists[key];
        return 1;
      }
      return 0;
    },
    scanIterator: async function* () {
      yield Object.keys(lists).filter((k) => k.startsWith("linky:queue:jobs:processing:"));
    },
  };
}

describe("reapStrandedProcessingLists (integration-ish)", () => {
  it("requeues stranded jobs from dead workers, leaves alive workers alone", async () => {
    const dead = "dead";
    const alive = "alive";
    const deadKey = buildProcessingListKey(dead);
    const aliveKey = buildProcessingListKey(alive);

    const client = createInMemoryRedis({
      lists: {
        [deadKey]: ["job-old", "job-new"],
        [aliveKey]: ["job-active"],
        [JOB_QUEUE_KEY]: [],
      },
      alive: [buildWorkerHeartbeatKey(alive)],
    });

    const result = await reapStrandedProcessingLists(client);
    expect(result).toEqual({ requeued: 2, cleaned: 1 });

    const remaining = await client.exists(deadKey);
    expect(remaining).toBe(0);

    const aliveRemaining = await client.exists(aliveKey);
    // alive list still exists; aliveRemaining only checks heartbeat keys, so reuse rPopLPush
    const drained = await client.rPopLPush(aliveKey, JOB_QUEUE_KEY);
    expect(drained).toBe("job-active");
  });

  it("skips self workerId", async () => {
    const self = "self";
    const selfKey = buildProcessingListKey(self);
    const client = createInMemoryRedis({
      lists: { [selfKey]: ["job-mine"], [JOB_QUEUE_KEY]: [] },
      alive: [],
    });

    const result = await reapStrandedProcessingLists(client, { selfWorkerId: self });
    expect(result).toEqual({ requeued: 0, cleaned: 0 });

    const stillThere = await client.rPopLPush(selfKey, JOB_QUEUE_KEY);
    expect(stillThere).toBe("job-mine");
  });
});
