import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { ReportStatus } from "@/domains/reports/types/report-status.types.js";
import type { ReportUpdate } from "@/domains/reports/types/report.types.js";
import { fetchReportById, fetchReportWithContext, listReports, updateReportById } from "@/domains/reports/service/reports.service.js";
import { getReportAiSummaryByReportId } from "@/infra/supabase/repositories/report-ai-summaries.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";
import { enqueueReportAiSummaryJob } from "@/jobs/worker-ai/report-ai-summary.job.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:reports:admin:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as ReportStatus | undefined;
    const reporterUserId = req.query.reporter_user_id as string | undefined;
    const reportedUserId = req.query.reported_user_id as string | undefined;

    const { data, count } = await listReports({
      limit,
      offset,
      status,
      reporterUserId,
      reportedUserId,
    });

    const rowsWithAi = await Promise.all(
      data.map(async (r) => ({
        ...r,
        ai_summary: await getReportAiSummaryByReportId(r?.id ?? ""),
      })),
    );

    return res.json({
      data: rowsWithAi,
      count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/reports");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_REPORTS", "failedFetchReports", "Failed to fetch reports"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("REPORT_ID_REQUIRED", "reportIdRequired", "Report ID is required"),
      );
    }

    const reportWithContext = await fetchReportWithContext(id);

    if (!reportWithContext) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("REPORT_NOT_FOUND", "reportNotFound", "Report not found"),
      );
    }

    const aiSummary = await getReportAiSummaryByReportId(id);
    return res.json({ ...reportWithContext, ai_summary: aiSummary });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/reports/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_ADMIN_REPORT", "failedFetchAdminReport", "Failed to fetch report"),
    );
  }
});

router.post(
  "/:id/ai-summary:generate",
  createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 5 }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("REPORT_ID_REQUIRED", "reportIdRequired", "Report ID is required"),
        );
      }

      const existing = await fetchReportById(id);
      if (!existing) {
        return sendJsonError(
          res,
          404,
          "Not Found",
          um("REPORT_NOT_FOUND", "reportNotFound", "Report not found"),
        );
      }

      enqueueReportAiSummaryJob({ reportId: id, force: true });

      return sendJsonWithUserMessage(
        res,
        202,
        { success: true },
        umDetail("REPORT_AI_SUMMARY_QUEUED", "Report AI summary generation queued"),
      );
    } catch (error) {
      logger.error(toLoggableError(error), "Unexpected error in POST /admin/reports/:id/ai-summary:generate");
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um(
          "FAILED_GENERATE_REPORT_AI_SUMMARY",
          "failedGenerateReportAiSummary",
          "Failed to generate report AI summary",
        ),
      );
    }
  },
);

router.patch("/:id", async (req: Request, res: Response) => {
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

    const adminUserId = await getUserIdByClerkId(clerkUserId);
    if (!adminUserId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("ADMIN_USER_NOT_IN_DATABASE", "adminUserNotInDatabase", "Admin user not found in database"),
      );
    }

    const { id } = req.params as { id: string };

    if (!id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("REPORT_ID_REQUIRED", "reportIdRequired", "Report ID is required"),
      );
    }

    const updateData: Partial<ReportUpdate> = req.body;

    const existing = await fetchReportById(id);
    if (!existing) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("REPORT_NOT_FOUND", "reportNotFound", "Report not found"),
      );
    }

    const finalUpdateData: Partial<ReportUpdate> = {
      ...updateData,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    };

    if (updateData.status && updateData.status !== (existing as any).status) {
      finalUpdateData.reviewed_at = new Date().toISOString();
    }

    const updated = await updateReportById(id, finalUpdateData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /admin/reports/:id");

    if (error instanceof Error && error.message.includes("violates check constraint")) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("INVALID_REPORT_STATUS", "invalidReportStatus", "Invalid status value"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_REPORT", "failedUpdateReport", "Failed to update report"),
    );
  }
});

export default router;

