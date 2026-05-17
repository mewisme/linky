import {
  ackJob,
  moveToProcessing,
  pushToDlq,
  type RedisListClient,
} from "@ws/sdk-internal";
import type { JobDlqEntry } from "@ws/shared-types";
import type { InternalWorkerRuntimeEnv } from "@ws/worker-api";
import type { JobEnvelope } from "@ws/shared-types";
import type { Logger } from "@ws/logger";

import { postEnvelopeToInternalApi } from "../api/internal-client.js";

function formatJobLabel(envelope: JobEnvelope): string {
  switch (envelope.type) {
    case "report_ai_summary":
      return `type=report_ai_summary reportId=${envelope.payload.reportId} force=${envelope.payload.force === true}`;
    case "user_embedding_regenerate":
      return `type=user_embedding_regenerate userId=${envelope.payload.userId}`;
    case "apply_call_exp":
      return `type=apply_call_exp userId=${envelope.payload.userId} durationSeconds=${envelope.payload.durationSeconds}`;
  }
}

async function safeAck(
  client: RedisListClient,
  workerId: string,
  raw: string,
  logger: Logger,
): Promise<void> {
  try {
    await ackJob(client, workerId, raw);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn(err, "failed to ack job from processing list (workerId=%s)", workerId);
  }
}

async function safePushToDlq(
  client: RedisListClient,
  entry: JobDlqEntry,
  logger: Logger,
): Promise<void> {
  try {
    await pushToDlq(client, entry);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(err, "failed to push job to DLQ (label=%s reason=%s)", entry.label, entry.reason);
  }
}

export async function runJobLoop(options: {
  client: RedisListClient;
  env: InternalWorkerRuntimeEnv;
  logger: Logger;
  workerId: string;
  isStopping: () => boolean;
  parse: (raw: string) => { ok: true; data: JobEnvelope } | { ok: false; error: string };
}): Promise<void> {
  const { client, env, logger, workerId, isStopping, parse } = options;

  while (!isStopping()) {
    let raw: string | null;
    try {
      raw = await moveToProcessing(client, workerId, 5);
    } catch (error: unknown) {
      if (isStopping()) return;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(err, "redis dequeue error (workerId=%s)", workerId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    if (!raw || isStopping()) {
      continue;
    }

    const parsed = parse(raw);
    if (!parsed.ok) {
      logger.error(
        "Invalid job payload dropped: %s (payloadBytes=%d)",
        parsed.error,
        Buffer.byteLength(raw, "utf8"),
      );
      await safePushToDlq(
        client,
        {
          raw,
          label: "type=unknown",
          reason: "dropped",
          errorMessage: parsed.error,
          attempts: 0,
          failedAt: new Date().toISOString(),
          workerId,
        },
        logger,
      );
      await safeAck(client, workerId, raw, logger);
      continue;
    }

    const label = formatJobLabel(parsed.data);
    const started = Date.now();
    logger.info("Job dequeued (%s)", label);

    try {
      const result = await postEnvelopeToInternalApi(env, parsed.data, raw, logger);

      if (result.ok) {
        logger.info("Job completed (%s, durationMs=%d)", label, Date.now() - started);
        await safeAck(client, workerId, raw, logger);
        continue;
      }

      const reason = result.dropped ? "dropped" : "retries_exhausted";
      logger.error(
        new Error("Job internal API failed"),
        "Job not completed (%s, durationMs=%d, reason=%s)",
        label,
        Date.now() - started,
        reason,
      );
      await safePushToDlq(
        client,
        {
          raw,
          label,
          reason,
          lastStatus: result.lastStatus,
          errorMessage: result.errorMessage,
          attempts: result.attempts,
          failedAt: new Date().toISOString(),
          workerId,
        },
        logger,
      );
      await safeAck(client, workerId, raw, logger);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(err, "panic in job loop (label=%s)", label);
      await safePushToDlq(
        client,
        {
          raw,
          label,
          reason: "panic",
          errorMessage: err.message,
          attempts: 0,
          failedAt: new Date().toISOString(),
          workerId,
        },
        logger,
      );
      await safeAck(client, workerId, raw, logger);
    }
  }
}
