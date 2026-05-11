import type { JobEnvelope } from "@ws/shared-types";
import { enqueueJob } from "@ws/sdk-internal";

import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("jobs:queue");

export async function tryEnqueueJob(envelope: JobEnvelope): Promise<boolean> {
  if (!redisClient.isOpen) {
    return false;
  }

  try {
    await withRedisTimeout(() => enqueueJob(redisClient, envelope), "job-enqueue");
    return true;
  } catch (error: unknown) {
    logger.warn(
      toLoggableError(error),
      "job enqueue failed; falling back to in-process execution when applicable",
    );
    return false;
  }
}
