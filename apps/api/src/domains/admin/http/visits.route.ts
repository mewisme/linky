import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../../utils/logger.js";
import {
  createPageView,
  deletePageViewById,
  getPathViews,
  getRecentVisits,
  getVisitStats,
  getVisitorDetails,
} from "../service/admin-visits.service.js";

const router: ExpressRouter = Router();
const logger = new Logger("AdminVisitsRoute");

router.get("/visitor/:ip", async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "IP address is required",
      });
    }

    const result = await getVisitorDetails(ip);

    if (!result) {
      return res.status(404).json({
        error: "Not Found",
        message: "Visitor not found",
      });
    }

    if (result.pageViewsError) {
      logger.warn("Error fetching page views for visitor:", result.pageViewsError.message);
    }

    return res.json({
      visitor: result.visitor,
      pageViews: result.pageViews,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/visitor/:ip:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visitor details",
    });
  }
});

router.get("/path/:path", async (req: Request, res: Response) => {
  try {
    const { path } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (!path) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Path parameter is required",
      });
    }

    const decodedPath = decodeURIComponent(path);

    const result = await getPathViews({ page, limit, path: decodedPath });

    if (result.uniqueVisitorsError) {
      logger.warn("Error fetching unique visitors count:", result.uniqueVisitorsError.message);
    }

    return res.json({
      ...result.result,
      uniqueVisitors: result.uniqueIPs,
      path: decodedPath,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/path/:path:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch path views",
    });
  }
});

router.post("/page-view", async (req: Request, res: Response) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        error: "Bad Request",
        message: "path is required",
      });
    }

    const ip = req.clientIp;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Unable to determine client IP address",
      });
    }

    const result = await createPageView({ path, ip });

    if (!result.success) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create page view",
      });
    }

    return res.status(201).json({
      message: "Page view created successfully",
      path,
      ip,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /admin/visits/page-view:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create page view",
    });
  }
});

router.delete("/page-view/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Page view ID is required",
      });
    }

    const result = await deletePageViewById(id);

    if (result.error) {
      logger.error("Error deleting page view:", result.error.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete page view",
      });
    }

    return res.json({
      message: "Page view deleted successfully",
      id,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /admin/visits/page-view/:id:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete page view",
    });
  }
});

router.get("/recent", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const path = req.query.path as string | undefined;
    const ip = req.query.ip as string | undefined;

    const result = await getRecentVisits({ page, limit, path, ip });

    return res.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/recent:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch recent visits",
    });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getVisitStats();
    return res.json(stats);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/stats:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visit statistics",
    });
  }
});

export default router;

