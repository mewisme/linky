import type { JobsJobEnvelope } from "@ws/shared-types";
import { enqueueGeneralJob as pushGeneralJob } from "@ws/sdk-internal";

import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("jobs:worker-jobs:queue");

export async function tryEnqueueGeneralJob(envelope: JobsJobEnvelope): Promise<boolean> {
  if (!redisClient.isOpen) {
    return false;
  }

  try {
    await withRedisTimeout(() => pushGeneralJob(redisClient, envelope), "worker-jobs-enqueue");
    return true;
  } catch (error: unknown) {
    logger.warn(toLoggableError(error), "worker-jobs enqueue failed");
    return false;
  }
}
