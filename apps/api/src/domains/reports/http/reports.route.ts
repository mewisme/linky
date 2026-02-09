import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { createReportContext } from "@/infra/supabase/repositories/report-contexts.js";
import { collectReportContext } from "@/services/report-context.js";
import type { CreateReportBody } from "@/domains/reports/types/report.types.js";
import { createUserReport, listUserReports } from "@/domains/reports/service/reports.service.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:reports:route");

router.post("/", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const reporterUserId = await getUserIdByClerkId(clerkUserId);
    if (!reporterUserId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { reported_user_id, reason, call_id, room_id, behavior_flags } = req.body as CreateReportBody;

    if (!reported_user_id || !reason) {
      return res.status(400).json({
        error: "Bad Request",
        message: "reported_user_id and reason are required",
      });
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "reason must be a non-empty string",
      });
    }

    if (reported_user_id === reporterUserId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot report yourself",
      });
    }

    const report = await createUserReport({
      reporterUserId,
      reportedUserId: reported_user_id,
      reason: reason.trim(),
    });

    // Invalidate cache after successful database update
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

    } catch (error) {
      logger.error("Error creating report context: %o", error instanceof Error ? error : new Error(String(error)));
    }

    return res.status(201).json(report);
  } catch (error) {
    logger.error("Unexpected error in POST /reports: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message.includes("violates check constraint")) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot report yourself",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create report",
    });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Only cache when using default pagination (most common case)
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
    logger.error("Unexpected error in GET /reports/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user reports",
    });
  }
});

export default router;

