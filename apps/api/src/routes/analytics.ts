import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../utils/logger.js";
import {
  createPageView as createPageViewQuery,
  createVisitor as createVisitorQuery,
  incrementVisitor as incrementVisitorQuery,
  getVisitor,
} from "../lib/supabase/queries/index.js";

const router: ExpressRouter = Router();
const logger = new Logger("AnalyticsRoute");

router.post("/visitor", async (req: Request, res: Response) => {
  try {
    const ip = req.clientIp;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Unable to determine client IP address",
      });
    }

    let isNewVisitor = false;
    let visitor;

    try {
      visitor = await getVisitor(ip);

      if (visitor) {
        await incrementVisitorQuery(ip);
        visitor = await getVisitor(ip);
      } else {
        const created = await createVisitorQuery(ip);
        if (created) {
          isNewVisitor = true;
          visitor = await getVisitor(ip);
        }
      }
    } catch (visitorError) {
      logger.error("Error tracking visitor:", visitorError instanceof Error ? visitorError.message : "Unknown error");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to track visitor",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Visitor tracked successfully",
      ip,
      visitor: visitor ? {
        isNew: isNewVisitor,
        visitCount: visitor.visit_count || 1,
        firstVisit: visitor.first_visit,
        lastVisit: visitor.last_visit,
      } : null,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /analytics/visitor:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to track visitor",
    });
  }
});

router.post("/visit", async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    if (!path || typeof path !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "path is required and must be a string",
      });
    }

    const ip = req.clientIp;

    if (!ip) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Unable to determine client IP address",
      });
    }

    let visitor;

    try {
      visitor = await getVisitor(ip);

      if (!visitor) {
        await createVisitorQuery(ip);
        visitor = await getVisitor(ip);
      }
    } catch (visitorError) {
      logger.error("Error ensuring visitor exists:", visitorError instanceof Error ? visitorError.message : "Unknown error");
    }

    let pageViewCreated = false;
    try {
      pageViewCreated = await createPageViewQuery(path, ip);
    } catch (pageViewError) {
      logger.error("Error creating page view:", pageViewError instanceof Error ? pageViewError.message : "Unknown error");
    }

    return res.status(201).json({
      success: true,
      message: "Page view tracked successfully",
      path,
      ip,
      visitor: visitor ? {
        visitCount: visitor.visit_count || 1,
        firstVisit: visitor.first_visit,
        lastVisit: visitor.last_visit,
      } : null,
      pageViewCreated,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /analytics/visit:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to track visit",
    });
  }
});

export default router;

