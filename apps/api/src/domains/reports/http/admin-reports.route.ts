import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { ReportStatus } from "@/domains/reports/types/report-status.types.js";
import type { ReportUpdate } from "@/domains/reports/types/report.types.js";
import { fetchReportById, fetchReportWithContext, listReports, updateReportById } from "@/domains/reports/service/reports.service.js";
import { getReportAiSummaryByReportId } from "@/infra/supabase/repositories/report-ai-summaries.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";
import { generateReportAiSummary } from "@/domains/reports/service/report-ai-summary.service.js";

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
    logger.error(error as Error, "Unexpected error in GET /admin/reports");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch reports",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Report ID is required",
      });
    }

    const reportWithContext = await fetchReportWithContext(id);

    if (!reportWithContext) {
      return res.status(404).json({
        error: "Not Found",
        message: "Report not found",
      });
    }

    const aiSummary = await getReportAiSummaryByReportId(id);
    return res.json({ ...reportWithContext, ai_summary: aiSummary });
  } catch (error) {
    logger.error(error as Error, "Unexpected error in GET /admin/reports/:id");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch report",
    });
  }
});

router.post(
  "/:id/ai-summary:generate",
  createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 5 }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Report ID is required",
        });
      }

      const existing = await fetchReportById(id);
      if (!existing) {
        return res.status(404).json({
          error: "Not Found",
          message: "Report not found",
        });
      }

      setImmediate(() => {
        generateReportAiSummary(id, { force: true }).catch((error) => {
          logger.error(error as Error, "Error regenerating report AI summary");
        });
      });

      return res.status(202).json({ success: true });
    } catch (error) {
      logger.error(error as Error, "Unexpected error in POST /admin/reports/:id/ai-summary:generate");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to generate report AI summary",
      });
    }
  },
);

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const adminUserId = await getUserIdByClerkId(clerkUserId);
    if (!adminUserId) {
      return res.status(404).json({
        error: "Not Found",
        message: "Admin user not found in database",
      });
    }

    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Report ID is required",
      });
    }

    const updateData: Partial<ReportUpdate> = req.body;

    const existing = await fetchReportById(id);
    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: "Report not found",
      });
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
    logger.error(error as Error, "Unexpected error in PATCH /admin/reports/:id");

    if (error instanceof Error && error.message.includes("violates check constraint")) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid status value",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update report",
    });
  }
});

export default router;

