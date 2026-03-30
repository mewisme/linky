import "dotenv/config";

import { createClient } from "redis";

import { initLogger } from "@ws/logger";
import { dequeueGeneralJob } from "@ws/sdk-internal";
import { JOBS_QUEUE_KEY } from "@ws/shared-types";

import { getWorkerRedisOptions } from "./redis-options.js";

const { createLogger } = initLogger();
const logger = createLogger("worker-jobs");

const client = createClient(getWorkerRedisOptions());

let stopping = false;

async function loop(): Promise<void> {
  while (!stopping) {
    const raw = await dequeueGeneralJob(client, 5);
    if (!raw || stopping) {
      continue;
    }

    logger.warn("No general job handlers registered yet. Dropping payload length=%d", raw.length);
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
