import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import { createReport, getUserReports } from "../../lib/supabase/queries/reports.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";

const router: ExpressRouter = Router();
const logger = new Logger("ReportsRoute");

router.post("/", async (req: Request, res: Response) => {
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

    const { reported_user_id, reason } = req.body;

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

    const report = await createReport({
      reporter_user_id: reporterUserId,
      reported_user_id: reported_user_id,
      reason: reason.trim(),
      status: "pending",
    });

    logger.info("Report created:", report.id);

    return res.status(201).json(report);
  } catch (error) {
    logger.error("Unexpected error in POST /reports:", error instanceof Error ? error.message : "Unknown error");

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

    const { data, count } = await getUserReports(userId, { limit, offset });

    logger.info("User reports fetched for user:", userId);

    return res.json({
      data,
      count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /reports/me:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user reports",
    });
  }
});

export default router;
