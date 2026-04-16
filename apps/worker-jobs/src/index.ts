import "dotenv/config";

import { inspect } from "node:util";
import { createClient } from "redis";

import { initLogger } from "@ws/logger";
import { dequeueGeneralJob } from "@ws/sdk-internal";
import { JOBS_QUEUE_KEY, type JobsJobEnvelope } from "@ws/shared-types";
import { safeParseJobsJobEnvelope } from "@ws/validation";
import { executeGeneralJob } from "@ws/api/worker-jobs";

import { getWorkerRedisOptions } from "./redis-options.js";

const { createLogger } = initLogger();
const logger = createLogger("worker-jobs");

const client = createClient(getWorkerRedisOptions());

let stopping = false;

function formatJobsJobLabel(envelope: JobsJobEnvelope): string {
  switch (envelope.type) {
    case "apply_call_exp":
      return `type=apply_call_exp userId=${envelope.payload.userId} durationSeconds=${envelope.payload.durationSeconds}`;
  }
}

async function loop(): Promise<void> {
  while (!stopping) {
    const raw = await dequeueGeneralJob(client, 5);
    if (!raw || stopping) {
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

    try {
      await executeGeneralJob(parsed.data);
      logger.info("General job completed (%s, durationMs=%d)", label, Date.now() - started);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(inspect(error));
      logger.error(err, "General job failed (%s, durationMs=%d)", label, Date.now() - started);
    }
  }
}

async function main(): Promise<void> {
  logger.info("worker-jobs starting (queue=%s)", JOBS_QUEUE_KEY);

  client.on("error", (error) => {
    logger.error(error as Error, "worker-jobs redis error");
  });

  await client.connect();

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker-jobs shutdown (%s)", signal);
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await loop();
}

void main().catch((error) => {
  logger.fatal(error as Error, "worker-jobs fatal error");
  process.exit(1);
});
