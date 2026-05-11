import { sha256Hex } from "@ws/internal-worker-api";
import { Router, type Request, type Response } from "express";
import { jobEnvelopeSchema } from "@ws/validation";

import { executeApplyCallExpJob } from "@/worker/worker-jobs/apply-call-exp.js";
import { executeReportAiSummaryJob } from "@/worker/worker-ai/report-ai-summary.js";
import { executeUserEmbeddingRegenerateJob } from "@/worker/worker-ai/user-embedding-regenerate.js";
import {
  releaseGeneralJobIdempotency,
  tryReserveGeneralJobIdempotency,
} from "@/infra/redis/worker-idempotency.js";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

import { internalWorkerAuthMiddleware } from "@/middleware/internal-worker-auth.js";

const logger = createLogger("api:internal:worker");

export function createInternalWorkerRouter(): Router {
  const router = Router();
  router.use(internalWorkerAuthMiddleware);

  router.post("/jobs", async (req: Request, res: Response) => {
    const requestId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
    const idem = req.headers["idempotency-key"];
    const idempotencyKey = typeof idem === "string" && idem.length > 0 ? idem : null;
    if (!idempotencyKey) {
      logger.warn({ requestId }, "internal jobs missing Idempotency-Key");
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("IDEMPOTENCY_KEY_REQUIRED", "idempotencyKeyRequired", "Idempotency-Key header is required"),
      );
    }

    const parsed = jobEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { requestId, issues: parsed.error.issues },
        "internal jobs validation failed",
      );
      return sendJsonError(res, 400, "Bad Request", umDetail("JOBS_VALIDATION", parsed.error.message));
    }

    const bodyHash = sha256Hex(JSON.stringify(parsed.data));
    const outcome = await tryReserveGeneralJobIdempotency(idempotencyKey, bodyHash);
    if (outcome === "replay") {
      logger.info({ requestId }, "internal jobs idempotent replay");
      return res.status(204).send();
    }
    if (outcome === "conflict") {
      logger.warn({ requestId }, "internal jobs idempotency conflict");
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("IDEMPOTENCY_CONFLICT", "idempotencyKeyBodyMismatch", "Idempotency-Key was used with a different body"),
      );
    }

    const envelope = parsed.data;
    try {
      switch (envelope.type) {
        case "report_ai_summary": {
          await executeReportAiSummaryJob(envelope.payload.reportId, envelope.payload.force === true);
          break;
        }
        case "user_embedding_regenerate": {
          await executeUserEmbeddingRegenerateJob(envelope.payload.userId);
          break;
        }
        case "apply_call_exp": {
          await executeApplyCallExpJob(envelope.payload);
          break;
        }
        default: {
          const _x: never = envelope;
          void _x;
        }
      }
      return res.status(204).send();
    } catch (error: unknown) {
      logger.error(toLoggableError(error), "internal jobs execution failed");
      await releaseGeneralJobIdempotency(idempotencyKey);
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("JOB_EXECUTION_FAILED", "jobExecutionFailed", "Job execution failed"),
      );
    }
  });

  return router;
}
