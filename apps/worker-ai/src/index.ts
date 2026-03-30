import "dotenv/config";
import "./instrument.js";

import { inspect } from "node:util";
import { createClient } from "redis";

import { initLogger } from "@ws/logger";
import { dequeueAiJob } from "@ws/sdk-internal";
import { AI_JOB_QUEUE_KEY, type AiJobEnvelope } from "@ws/shared-types";
import { safeParseAiJobEnvelope } from "@ws/validation";
import { executeAiJob } from "@ws/api/worker-ai";

import { getWorkerRedisOptions } from "./redis-options.js";

const { createLogger } = initLogger();
const logger = createLogger("worker-ai");

const client = createClient(getWorkerRedisOptions());

let stopping = false;

function formatAiJobLabel(envelope: AiJobEnvelope): string {
  switch (envelope.type) {
    case "report_ai_summary":
      return `type=report_ai_summary reportId=${envelope.payload.reportId} force=${envelope.payload.force === true}`;
    case "user_embedding_regenerate":
      return `type=user_embedding_regenerate userId=${envelope.payload.userId}`;
  }
}

async function loop(): Promise<void> {
  while (!stopping) {
    const raw = await dequeueAiJob(client, 5);
    if (!raw || stopping) {
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

    try {
      await executeAiJob(parsed.data);
      logger.info("AI job completed (%s, durationMs=%d)", label, Date.now() - started);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(inspect(error));
      logger.error(err, "AI job failed (%s, durationMs=%d)", label, Date.now() - started);
    }
  }
}

async function main(): Promise<void> {
  logger.info("worker-ai starting (queue=%s)", AI_JOB_QUEUE_KEY);

  client.on("error", (error) => {
    logger.error(error instanceof Error ? error : new Error(inspect(error)), "worker-ai redis error");
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
  logger.fatal(error instanceof Error ? error : new Error(inspect(error)), "worker-ai fatal error");
  process.exit(1);
});
