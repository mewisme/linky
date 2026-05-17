import {
  JOB_DLQ_KEY,
  JOB_PROCESSING_LIST_PREFIX,
  JOB_QUEUE_KEY,
  WORKER_HEARTBEAT_TTL_SECONDS,
  buildProcessingListKey,
  buildWorkerHeartbeatKey,
  processingListWorkerId,
  type JobDlqEntry,
  type JobEnvelope,
} from "@ws/shared-types";

export type RedisListClient = {
  lPush: (key: string, element: string) => Promise<unknown>;
  brPop: (key: string, timeoutSeconds: number) => Promise<{ element: string } | null>;
  blMove: (
    source: string,
    destination: string,
    sourceDirection: "LEFT" | "RIGHT",
    destinationDirection: "LEFT" | "RIGHT",
    timeoutSeconds: number,
  ) => Promise<string | null>;
  lRem: (key: string, count: number, element: string) => Promise<number>;
  rPopLPush: (source: string, destination: string) => Promise<string | null>;
  setEx: (key: string, seconds: number, value: string) => Promise<unknown>;
  exists: (key: string) => Promise<number>;
  del: (key: string) => Promise<number>;
  scanIterator: (opts: { MATCH: string; COUNT?: number }) => AsyncIterable<string[]>;
};

export async function enqueueJob(client: RedisListClient, envelope: JobEnvelope): Promise<void> {
  await client.lPush(JOB_QUEUE_KEY, JSON.stringify(envelope));
}

export async function dequeueJob(client: RedisListClient, timeoutSeconds: number): Promise<string | null> {
  const res = await client.brPop(JOB_QUEUE_KEY, timeoutSeconds);
  return res?.element ?? null;
}

export async function moveToProcessing(
  client: RedisListClient,
  workerId: string,
  timeoutSeconds: number,
): Promise<string | null> {
  const processingKey = buildProcessingListKey(workerId);
  return client.blMove(JOB_QUEUE_KEY, processingKey, "RIGHT", "LEFT", timeoutSeconds);
}

export async function ackJob(client: RedisListClient, workerId: string, raw: string): Promise<number> {
  const processingKey = buildProcessingListKey(workerId);
  return client.lRem(processingKey, 1, raw);
}

export async function pushToDlq(client: RedisListClient, entry: JobDlqEntry): Promise<void> {
  await client.lPush(JOB_DLQ_KEY, JSON.stringify(entry));
}

export async function refreshHeartbeat(client: RedisListClient, workerId: string): Promise<void> {
  const heartbeatKey = buildWorkerHeartbeatKey(workerId);
  await client.setEx(heartbeatKey, WORKER_HEARTBEAT_TTL_SECONDS, "1");
}

export async function clearHeartbeat(client: RedisListClient, workerId: string): Promise<void> {
  const heartbeatKey = buildWorkerHeartbeatKey(workerId);
  await client.del(heartbeatKey);
}

export type ReapResult = {
  requeued: number;
  cleaned: number;
};

export async function reapStrandedProcessingLists(
  client: RedisListClient,
  options: { selfWorkerId?: string; scanCount?: number; maxRequeuePerList?: number } = {},
): Promise<ReapResult> {
  const selfWorkerId = options.selfWorkerId;
  const scanCount = options.scanCount ?? 50;
  const maxRequeuePerList = options.maxRequeuePerList ?? 10_000;

  let requeued = 0;
  let cleaned = 0;

  const seen = new Set<string>();

  for await (const batch of client.scanIterator({
    MATCH: `${JOB_PROCESSING_LIST_PREFIX}*`,
    COUNT: scanCount,
  })) {
    for (const key of batch) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const workerId = processingListWorkerId(key);
      if (!workerId) {
        continue;
      }
      if (selfWorkerId && workerId === selfWorkerId) {
        continue;
      }

      const heartbeatKey = buildWorkerHeartbeatKey(workerId);
      const alive = await client.exists(heartbeatKey);
      if (alive > 0) {
        continue;
      }

      let movedFromList = 0;
      while (movedFromList < maxRequeuePerList) {
        const moved = await client.rPopLPush(key, JOB_QUEUE_KEY);
        if (moved === null) {
          break;
        }
        movedFromList += 1;
      }

      requeued += movedFromList;
      await client.del(key);
      cleaned += 1;
    }
  }

  return { requeued, cleaned };
}
