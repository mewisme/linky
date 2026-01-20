import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../../utils/logger.js";
import { getOverview, getPageViewsForAdmin, getTopPagesForAdmin, getVisitorStatsForAdmin, getVisitorsForAdmin } from "../service/admin-analytics.service.js";

const router: ExpressRouter = Router();
const logger = new Logger("AdminAnalyticsRoute");

router.get("/", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const result = await getOverview(days);
    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/analytics:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch analytics",
    });
  }
});

router.get("/page-views", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const timeseries = req.query.timeseries === "true" || req.query.timeseries === "1";
    const result = await getPageViewsForAdmin({ days, page, limit, timeseries });
    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/analytics/page-views:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch page views",
    });
  }
});

router.get("/visitors", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const timeseries = req.query.timeseries === "true" || req.query.timeseries === "1";
    const result = await getVisitorsForAdmin({ days, page, limit, timeseries });
    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/analytics/visitors:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visitors",
    });
  }
});

router.get("/top-pages", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const result = await getTopPagesForAdmin(limit);
    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/analytics/top-pages:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch top pages",
    });
  }
});

router.get("/visitor-stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getVisitorStatsForAdmin();
    return res.json(stats);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/analytics/visitor-stats:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visitor stats",
    });
  }
});

export default router;

