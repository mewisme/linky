import { dequeueGeneralJob } from "@ws/sdk-internal";
import type { JobsJobEnvelope } from "@ws/shared-types";
import { safeParseJobsJobEnvelope } from "@ws/validation";
import type { Logger } from "@ws/logger";
import type { createClient } from "redis";

import type { InternalWorkerRuntimeEnv } from "@ws/internal-worker-api";

import { postEnvelopeToInternalApi } from "../internal-api-client.js";

function formatJobsJobLabel(envelope: JobsJobEnvelope): string {
  switch (envelope.type) {
    case "apply_call_exp":
      return `type=apply_call_exp userId=${envelope.payload.userId} durationSeconds=${envelope.payload.durationSeconds}`;
  }
}

export async function runGeneralJobLoop(options: {
  client: ReturnType<typeof createClient>;
  env: InternalWorkerRuntimeEnv;
  logger: Logger;
  isStopping: () => boolean;
}): Promise<void> {
  const { client, env, logger, isStopping } = options;

  while (!isStopping()) {
    const raw = await dequeueGeneralJob(client, 5);
    if (!raw || isStopping()) {
      continue;
    }

    const parsed = safeParseJobsJobEnvelope(raw);
    if (!parsed.ok) {
      logger.error(
        "Invalid general job payload dropped: %s (payloadBytes=%d)",
        parsed.error,
        Buffer.byteLength(raw, "utf8"),
      );
      continue;
    }

    const label = formatJobsJobLabel(parsed.data);
    const started = Date.now();
    logger.info("General job dequeued (%s)", label);

    const result = await postEnvelopeToInternalApi(
      env,
      "general-jobs",
      parsed.data,
      raw,
      logger,
      "general",
    );

    if (result.ok) {
      logger.info("General job completed (%s, durationMs=%d)", label, Date.now() - started);
    } else if (!result.dropped) {
      logger.error(
        new Error("General job internal API failed after retries"),
        "General job not completed (%s, durationMs=%d)",
        label,
        Date.now() - started,
      );
    }
  }
}
