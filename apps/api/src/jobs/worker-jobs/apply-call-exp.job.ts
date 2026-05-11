import type { ApplyCallExpJobEnvelope } from "@ws/shared-types";

import { tryEnqueueJob } from "@/jobs/job-queue.js";

export async function tryEnqueueApplyCallExpJob(
  payload: ApplyCallExpJobEnvelope["payload"],
): Promise<boolean> {
  const envelope: ApplyCallExpJobEnvelope = {
    v: 1,
    type: "apply_call_exp",
    payload,
  };
  return tryEnqueueJob(envelope);
}
