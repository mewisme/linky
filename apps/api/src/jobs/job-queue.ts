import type { AiJobEnvelope } from "@ws/shared-types";
import { enqueueAiJob } from "@ws/sdk-internal";

import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("jobs:queue");

export async function tryEnqueueAsyncJob(envelope: AiJobEnvelope): Promise<boolean> {
  if (!redisClient.isOpen) {
    return false;
  }

  try {
    await withRedisTimeout(
      () => enqueueAiJob(redisClient, envelope),
      "async-job-enqueue",
    );
    return true;
  } catch (error) {
    logger.warn(
      error instanceof Error ? error : new Error(String(error)),
      "Async job enqueue failed; falling back to in-process execution when applicable",
    );
    return false;
  }
}
