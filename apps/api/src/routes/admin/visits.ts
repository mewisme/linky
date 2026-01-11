import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { logger } from "../../utils/logger.js";
import {
  getVisitor,
  getPageViews,
  getVisitors,
  getTopPages,
  getVisitorStats,
  createPageView as createPageViewQuery,
  createVisitor as createVisitorQuery,
  incrementVisitor as incrementVisitorQuery,
} from "../../lib/supabase/queries/index.js";
import { supabase } from "../../lib/supabase/client.js";

const router: ExpressRouter = Router();

/**
 * GET /api/v1/admin/visits/visitor/:ip
 * Get detailed information about a specific visitor by IP
 */
router.get("/visitor/:ip", async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "IP address is required",
      });
    }

    const visitor = await getVisitor(ip);

    if (!visitor) {
      return res.status(404).json({
        error: "Not Found",
        message: "Visitor not found",
      });
    }

    // Get page views for this visitor
    const { data: pageViews, error: pageViewsError } = await supabase
      .from("page_views")
      .select("*")
      .eq("ip", ip)
      .order("created_at", { ascending: false })
      .limit(100);

    if (pageViewsError) {
      logger.warn("Error fetching page views for visitor:", pageViewsError.message);
    }

    return res.json({
      visitor,
      pageViews: pageViews || [],
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/visitor/:ip:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visitor details",
    });
  }
});

/**
 * GET /api/v1/admin/visits/path/:path
 * Get page views for a specific path
 * Query params: page, limit
 */
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

    const result = await getPageViews({ page, limit, path: decodedPath });

    // Get unique visitors count for this path
    const { data: pageViewsData, error: uniqueVisitorsError } = await supabase
      .from("page_views")
      .select("ip")
      .eq("path", decodedPath);

    if (uniqueVisitorsError) {
      logger.warn("Error fetching unique visitors count:", uniqueVisitorsError.message);
    }

    // Count unique IPs
    const uniqueIPs = new Set(
      ((pageViewsData as any) || []).map((view: any) => view.ip)
    ).size;

    return res.json({
      ...result,
      uniqueVisitors: uniqueIPs,
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

/**
 * POST /api/v1/admin/visits/page-view
 * Create a page view
 * Body: { path: string } - IP is automatically extracted from request via middleware
 */
router.post("/page-view", async (req: Request, res: Response) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({
        error: "Bad Request",
        message: "path is required",
      });
    }

    // Get IP from request (set by clientIpMiddleware)
    const ip = req.clientIp;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Unable to determine client IP address",
      });
    }

    const success = await createPageViewQuery(path, ip);

    if (!success) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create page view",
      });
    }

    // Check if visitor exists and increment or create
    const existingVisitor = await getVisitor(ip);
    if (existingVisitor) {
      await incrementVisitorQuery(ip);
    } else {
      await createVisitorQuery(ip);
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

/**
 * DELETE /api/v1/admin/visits/page-view/:id
 * Delete a specific page view by ID
 */
router.delete("/page-view/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Page view ID is required",
      });
    }

    const { error } = await supabase
      .from("page_views")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting page view:", error.message);
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
    logger.error("Unexpected error in DELETE /admin/visits/page-view/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete page view",
    });
  }
});

/**
 * GET /api/v1/admin/visits/recent
 * Get recent visits (page views) with optional filters
 * Query params: page, limit, path, ip
 */
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const path = req.query.path as string | undefined;
    const ip = req.query.ip as string | undefined;

    const options: any = { page, limit };
    if (path) {
      options.path = path;
    }

    const result = await getPageViews(options);

    // Filter by IP if provided
    let filteredData = result.data;
    if (ip) {
      filteredData = (result.data as any[]).filter((view: any) => view.ip === ip);
    }

    return res.json({
      data: filteredData,
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

/**
 * GET /api/v1/admin/visits/stats
 * Get comprehensive visit statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [visitorStats, topPages] = await Promise.all([
      getVisitorStats(),
      getTopPages(10),
    ]);

    return res.json({
      visitors: visitorStats,
      topPages,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/visits/stats:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch visit statistics",
    });
  }
});

export default router;

