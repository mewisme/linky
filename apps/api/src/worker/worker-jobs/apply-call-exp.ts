import type { ApplyCallExpJobEnvelope } from "@ws/shared-types";

import { addCallExp } from "@/domains/user/index.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("api:worker:jobs:apply-call-exp");

export async function executeApplyCallExpJob(
  payload: ApplyCallExpJobEnvelope["payload"],
): Promise<void> {
  const { userId, durationSeconds, expSecondsToAdd, timezone, counterpartUserId, dateForExpToday } = payload;
  const t0 = Date.now();
  logger.info("apply_call_exp start userId=%s durationSeconds=%d", userId, durationSeconds);
  await addCallExp(userId, durationSeconds, {
    timezone,
    counterpartUserId,
    dateForExpToday,
    ...(expSecondsToAdd != null ? { expSecondsToAdd } : {}),
  });
  logger.info("apply_call_exp done userId=%s durationMs=%d", userId, Date.now() - t0);
}
