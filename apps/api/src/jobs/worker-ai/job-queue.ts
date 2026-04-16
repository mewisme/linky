import type { AiJobEnvelope } from "@ws/shared-types";
import { enqueueAiJob } from "@ws/sdk-internal";

import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("jobs:worker-ai:queue");

export async function tryEnqueueAiJob(envelope: AiJobEnvelope): Promise<boolean> {
  if (!redisClient.isOpen) {
    return false;
  }

  try {
    await withRedisTimeout(() => enqueueAiJob(redisClient, envelope), "worker-ai-enqueue");
    return true;
  } catch (error: unknown) {
    logger.warn(
      toLoggableError(error),
      "worker-ai job enqueue failed; falling back to in-process execution when applicable",
    );
    return false;
  }
}
