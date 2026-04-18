import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { createReportContext } from "@/infra/supabase/repositories/report-contexts.js";
import { collectReportContext } from "@/services/report-context.js";
import type { CreateReportBody } from "@/domains/reports/types/report.types.js";
import { createUserReport, listUserReports } from "@/domains/reports/service/reports.service.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";
import { enqueueReportAiSummaryJob } from "@/jobs/worker-ai/report-ai-summary.job.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:reports:route");

router.post("/", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const reporterUserId = await getUserIdByClerkId(clerkUserId);
    if (!reporterUserId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const { reported_user_id, reason, call_id, room_id, behavior_flags } = req.body as CreateReportBody;

    if (!reported_user_id || !reason) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("REPORT_ID_REASON_REQUIRED", "reportedUserIdAndReasonRequired", "reported_user_id and reason are required"),
      );
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("REPORT_REASON_NONEMPTY", "reasonNonEmpty", "reason must be a non-empty string"),
      );
    }

    if (reported_user_id === reporterUserId) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("CANNOT_REPORT_SELF", "cannotReportYourself", "Cannot report yourself"),
      );
    }

    const report = await createUserReport({
      reporterUserId,
      reportedUserId: reported_user_id,
      reason: reason.trim(),
    });

    await invalidateCacheKey(CACHE_KEYS.userReports(reporterUserId));

    try {
      const contextData = await collectReportContext({
        reporterUserId,
        reportedUserId: reported_user_id,
        callId: call_id,
        roomId: room_id,
        behaviorFlags: behavior_flags as any,
      });

      await createReportContext({
        report_id: report.id,
        ...contextData,
      });

      enqueueReportAiSummaryJob({ reportId: report.id });
    } catch (error) {
      logger.error(toLoggableError(error), "Error creating report context");
    }

    return res.status(201).json(report);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /reports");

    if (error instanceof Error && error.message.includes("violates check constraint")) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("CANNOT_REPORT_SELF", "cannotReportYourself", "Cannot report yourself"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_CREATE_REPORT", "failedCreateReport", "Failed to create report"),
    );
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const shouldCache = limit === 50 && offset === 0;

    let data, count;

    if (shouldCache) {
      ({ data, count } = await getCachedData(
        CACHE_KEYS.userReports(userId),
        () => listUserReports({ userId, limit, offset }),
        CACHE_TTL.USER_REPORTS
      ));
    } else {
      ({ data, count } = await listUserReports({ userId, limit, offset }));
    }

    return res.json({
      data,
      count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /reports/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_USER_REPORTS", "failedFetchUserReports", "Failed to fetch user reports"),
    );
  }
});

export default router;
