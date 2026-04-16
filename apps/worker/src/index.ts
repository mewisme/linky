import "./instrument.js";

import { inspect } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "redis";
import { config as loadDotenv } from "dotenv";

import { initLogger } from "@ws/logger";
import { parseInternalWorkerRuntimeEnv } from "@ws/internal-worker-api";

import { runAiJobLoop } from "./queues/ai-job-loop.js";
import { runGeneralJobLoop } from "./queues/general-job-loop.js";
import { getWorkerRedisOptions } from "./redis-options.js";

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
  root.fatal(err, "invalid worker environment (INTERNAL_API_BASE_URL, INTERNAL_WORKER_SECRET, ...)");
  process.exit(1);
}

const logger = createLogger("worker");
const aiLogger = createLogger("worker:ai");
const generalLogger = createLogger("worker:general");

const redisOptions = getWorkerRedisOptions();
const aiRedis = createClient(redisOptions);
const generalRedis = createClient(redisOptions);

let stopping = false;

async function main(): Promise<void> {
  logger.info("worker starting (queues: ai, general)");

  const onRedisError = (error: unknown) => {
    logger.error(error instanceof Error ? error : new Error(inspect(error)), "worker redis error");
  };
  aiRedis.on("error", onRedisError);
  generalRedis.on("error", onRedisError);

  await Promise.all([aiRedis.connect(), generalRedis.connect()]);

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info("worker shutdown (%s)", signal);
    await Promise.all([
      aiRedis.quit().catch(() => aiRedis.disconnect()),
      generalRedis.quit().catch(() => generalRedis.disconnect()),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  const isStopping = () => stopping;

  await Promise.all([
    runAiJobLoop({ client: aiRedis, env: runtimeEnv, logger: aiLogger, isStopping }),
    runGeneralJobLoop({ client: generalRedis, env: runtimeEnv, logger: generalLogger, isStopping }),
  ]);
}

void main().catch((error) => {
  logger.fatal(error instanceof Error ? error : new Error(inspect(error)), "worker fatal error");
  process.exit(1);
});
