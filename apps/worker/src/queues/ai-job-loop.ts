import { dequeueAiJob } from "@ws/sdk-internal";
import type { AiJobEnvelope } from "@ws/shared-types";
import { safeParseAiJobEnvelope } from "@ws/validation";
import type { Logger } from "@ws/logger";
import type { createClient } from "redis";

import type { InternalWorkerRuntimeEnv } from "@ws/internal-worker-api";

import { postEnvelopeToInternalApi } from "../internal-api-client.js";

export function formatAiJobLabel(envelope: AiJobEnvelope): string {
  switch (envelope.type) {
    case "report_ai_summary":
      return `type=report_ai_summary reportId=${envelope.payload.reportId} force=${envelope.payload.force === true}`;
    case "user_embedding_regenerate":
      return `type=user_embedding_regenerate userId=${envelope.payload.userId}`;
  }
}

export async function runAiJobLoop(options: {
  client: ReturnType<typeof createClient>;
  env: InternalWorkerRuntimeEnv;
  logger: Logger;
  isStopping: () => boolean;
}): Promise<void> {
  const { client, env, logger, isStopping } = options;

  while (!isStopping()) {
    const raw = await dequeueAiJob(client, 5);
    if (!raw || isStopping()) {
      continue;
    }

    const parsed = safeParseAiJobEnvelope(raw);
    if (!parsed.ok) {
      logger.error(
        "Invalid AI job payload dropped: %s (payloadBytes=%d)",
        parsed.error,
        Buffer.byteLength(raw, "utf8"),
      );
      continue;
    }

    const label = formatAiJobLabel(parsed.data);
    const started = Date.now();
    logger.info("AI job dequeued (%s)", label);

    const result = await postEnvelopeToInternalApi(
      env,
      "ai-jobs",
      parsed.data,
      raw,
      logger,
      "ai",
    );

    if (result.ok) {
      logger.info("AI job completed (%s, durationMs=%d)", label, Date.now() - started);
    } else if (!result.dropped) {
      logger.error(
        new Error("AI job internal API failed after retries"),
        "AI job not completed (%s, durationMs=%d)",
        label,
        Date.now() - started,
      );
    }
  }
}
