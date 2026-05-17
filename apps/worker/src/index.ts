import { inspect } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { config as loadDotenv } from "dotenv";

import { initLogger } from "@ws/logger";
import { parseInternalWorkerRuntimeEnv } from "@ws/worker-api";
import { safeParseJobEnvelope } from "@ws/validation";

import { runJobLoop } from "./queues/run-job-loop.js";
import { startHeartbeat } from "./queues/heartbeat.js";
import { startReaper } from "./queues/reaper.js";
import { getWorkerRedisOptions } from "./infra/redis.js";

const { createLogger } = initLogger();

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../../.env");
loadDotenv({ path: rootEnvPath, quiet: true });

let runtimeEnv: ReturnType<typeof parseInternalWorkerRuntimeEnv>;
try {
  runtimeEnv = parseInternalWorkerRuntimeEnv();
} catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(inspect(error));
  const root = createLogger("worker");
  root.fatal(err, "invalid worker environment (INTERNAL_API_BASE_URL or INTERNAL_API_SOCKET_PATH, ...)");
  process.exit(1);
}

const logger = createLogger("worker");
const workerId = randomUUID();

const redis = createClient(getWorkerRedisOptions());

let stopping = false;

async function main(): Promise<void> {
  logger.info("worker starting (workerId=%s)", workerId);

  redis.on("error", (error: unknown) => {
    logger.error(error instanceof Error ? error : new Error(inspect(error)), "worker redis error");
  });

  await redis.connect();

  const heartbeat = startHeartbeat({ client: redis, workerId, logger });
  const reaper = startReaper({ client: redis, workerId, logger });

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker shutdown (%s)", signal);
    reaper.stop();
    await heartbeat.stop();
    await redis.quit().catch(() => redis.disconnect());
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await runJobLoop({
    client: redis,
    env: runtimeEnv,
    logger,
    workerId,
    isStopping: () => stopping,
    parse: safeParseJobEnvelope,
  });
}

void main().catch((error) => {
  logger.fatal(error instanceof Error ? error : new Error(inspect(error)), "worker fatal error");
  process.exit(1);
});
