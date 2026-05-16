import { dequeueJob, type RedisListClient } from "@ws/sdk-internal";
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

export async function runJobLoop(options: {
  client: RedisListClient;
  env: InternalWorkerRuntimeEnv;
  logger: Logger;
  isStopping: () => boolean;
  parse: (raw: string) => { ok: true; data: JobEnvelope } | { ok: false; error: string };
}): Promise<void> {
  const { client, env, logger, isStopping, parse } = options;

  while (!isStopping()) {
    const raw = await dequeueJob(client, 5);
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
      continue;
    }

    const label = formatJobLabel(parsed.data);
    const started = Date.now();
    logger.info("Job dequeued (%s)", label);

    const result = await postEnvelopeToInternalApi(env, parsed.data, raw, logger);

    if (result.ok) {
      logger.info("Job completed (%s, durationMs=%d)", label, Date.now() - started);
    } else if (!result.dropped) {
      logger.error(
        new Error("Job internal API failed after retries"),
        "Job not completed (%s, durationMs=%d)",
        label,
        Date.now() - started,
      );
    }
  }
}
