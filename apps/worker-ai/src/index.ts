import "dotenv/config";
import "./instrument.js";

import { createClient } from "redis";

import { initLogger } from "@ws/logger";
import { dequeueAiJob } from "@ws/sdk-internal";
import { AI_JOB_QUEUE_KEY } from "@ws/shared-types";
import { safeParseAiJobEnvelope } from "@ws/validation";
import { executeAiJob } from "@ws/api/worker-ai";

import { getWorkerRedisOptions } from "./redis-options.js";

const { createLogger } = initLogger();
const logger = createLogger("worker-ai");

const client = createClient(getWorkerRedisOptions());

let stopping = false;

async function loop(): Promise<void> {
  while (!stopping) {
    const raw = await dequeueAiJob(client, 5);
    if (!raw || stopping) {
      continue;
    }

    const parsed = safeParseAiJobEnvelope(raw);
    if (!parsed.ok) {
      logger.error("Invalid AI job payload dropped: %s", parsed.error);
      continue;
    }

    try {
      await executeAiJob(parsed.data);
    } catch (error) {
      logger.error(error as Error, "AI job execution failed (type=%s)", parsed.data.type);
    }
  }
}

async function main(): Promise<void> {
  logger.info("worker-ai starting (queue=%s)", AI_JOB_QUEUE_KEY);

  client.on("error", (error) => {
    logger.error(error as Error, "worker-ai redis error");
  });

  await client.connect();

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker-ai shutdown (%s)", signal);
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
  logger.fatal(error as Error, "worker-ai fatal error");
  process.exit(1);
});
