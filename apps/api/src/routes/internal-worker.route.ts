import { sha256Hex } from "@ws/internal-worker-api";
import { Router, type Request, type Response } from "express";
import { aiJobEnvelopeSchema, jobsJobEnvelopeSchema } from "@ws/validation";

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

  router.post("/ai-jobs", async (req: Request, res: Response) => {
    const requestId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
    const parsed = aiJobEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { requestId, issues: parsed.error.issues },
        "internal ai-jobs validation failed",
      );
      return sendJsonError(res, 400, "Bad Request", umDetail("AI_JOBS_VALIDATION", parsed.error.message));
    }

    const idem = req.headers["idempotency-key"];
    const idempotencyKey = typeof idem === "string" ? idem : undefined;
    if (idempotencyKey) {
      const bodyHash = sha256Hex(JSON.stringify(parsed.data));
      const outcome = await tryReserveGeneralJobIdempotency(idempotencyKey, bodyHash);
      if (outcome === "replay") {
        logger.info({ requestId, route: "ai-jobs" }, "internal ai-jobs idempotent replay");
        return res.status(204).send();
      }
      if (outcome === "conflict") {
        logger.warn({ requestId, route: "ai-jobs" }, "internal ai-jobs idempotency conflict");
        return sendJsonError(
          res,
          409,
          "Conflict",
          um("IDEMPOTENCY_CONFLICT", "idempotencyKeyBodyMismatch", "Idempotency-Key was used with a different body"),
        );
      }
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
        default: {
          const _x: never = envelope;
          void _x;
        }
      }
      if (idempotencyKey) {
        logger.info({ requestId, route: "ai-jobs" }, "internal ai-jobs completed");
      }
      return res.status(204).send();
    } catch (error: unknown) {
      logger.error(toLoggableError(error), "internal ai-jobs execution failed");
      if (idempotencyKey) {
        await releaseGeneralJobIdempotency(idempotencyKey);
      }
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("JOB_EXECUTION_FAILED", "jobExecutionFailed", "Job execution failed"),
      );
    }
  });

  router.post("/general-jobs", async (req: Request, res: Response) => {
    const requestId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
    const idem = req.headers["idempotency-key"];
    const idempotencyKey = typeof idem === "string" && idem.length > 0 ? idem : null;
    if (!idempotencyKey) {
      logger.warn({ requestId }, "internal general-jobs missing Idempotency-Key");
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("IDEMPOTENCY_KEY_REQUIRED", "idempotencyKeyRequired", "Idempotency-Key header is required"),
      );
    }

    const parsed = jobsJobEnvelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { requestId, issues: parsed.error.issues },
        "internal general-jobs validation failed",
      );
      return sendJsonError(res, 400, "Bad Request", umDetail("GENERAL_JOBS_VALIDATION", parsed.error.message));
    }

    const bodyHash = sha256Hex(JSON.stringify(parsed.data));
    const outcome = await tryReserveGeneralJobIdempotency(idempotencyKey, bodyHash);
    if (outcome === "replay") {
      logger.info({ requestId, route: "general-jobs" }, "internal general-jobs idempotent replay");
      return res.status(204).send();
    }
    if (outcome === "conflict") {
      logger.warn({ requestId, route: "general-jobs" }, "internal general-jobs idempotency conflict");
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("IDEMPOTENCY_CONFLICT_G", "idempotencyKeyBodyMismatch", "Idempotency-Key was used with a different body"),
      );
    }

    const envelope = parsed.data;
    try {
      if (envelope.type === "apply_call_exp") {
        await executeApplyCallExpJob(envelope.payload);
      }
      return res.status(204).send();
    } catch (error: unknown) {
      logger.error(toLoggableError(error), "internal general-jobs execution failed");
      await releaseGeneralJobIdempotency(idempotencyKey);
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("JOB_EXECUTION_FAILED_G", "jobExecutionFailed", "Job execution failed"),
      );
    }
  });

  return router;
}
