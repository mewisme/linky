import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import {
  createPageView,
  deletePageViewById,
  getPathViews,
  getRecentVisits,
  getVisitStats,
  getVisitorDetails,
} from "@/domains/admin/service/admin-visits.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:visits:route");

router.get("/visitor/:ip", async (req: Request, res: Response) => {
  try {
    const { ip } = req.params as { ip: string };

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
      logger.warn("Error fetching page views for visitor: %o", result.pageViewsError);
    }

    return res.json({
      visitor: result.visitor,
      pageViews: result.pageViews,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/visitor/:ip: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visitor details",
    });
  }
});

router.get("/path/:path", async (req: Request, res: Response) => {
  try {
    const { path } = req.params as { path: string };
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
      logger.warn("Error fetching unique visitors count: %o", result.uniqueVisitorsError);
    }

    return res.json({
      ...result.result,
      uniqueVisitors: result.uniqueIPs,
      path: decodedPath,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/path/:path: %o", error instanceof Error ? error : new Error(String(error)));
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
    logger.error("Unexpected error in POST /admin/visits/page-view: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create page view",
    });
  }
});

router.delete("/page-view/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Page view ID is required",
      });
    }

    const result = await deletePageViewById(id);

    if (result.error) {
      logger.error("Error deleting page view: %o", result.error);
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
      "Unexpected error in DELETE /admin/visits/page-view/:id: %o",
      error instanceof Error ? error : new Error(String(error)),
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
    logger.error("Unexpected error in GET /admin/visits/recent: %o", error instanceof Error ? error : new Error(String(error)));
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
    logger.error("Unexpected error in GET /admin/visits/stats: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visit statistics",
    });
  }
});

export default router;

