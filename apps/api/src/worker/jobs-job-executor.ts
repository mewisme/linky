import type { JobsJobEnvelope } from "@ws/shared-types";

import { executeApplyCallExpJob } from "@/worker/worker-jobs/apply-call-exp.js";

export async function executeGeneralJob(envelope: JobsJobEnvelope): Promise<void> {
  switch (envelope.type) {
    case "apply_call_exp": {
      await executeApplyCallExpJob(envelope.payload);
      return;
    }
  }
}
