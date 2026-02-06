import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import {
  createPageView as createPageViewQuery,
  createVisitor as createVisitorQuery,
  incrementVisitor as incrementVisitorQuery,
  getVisitor,
} from "@/infra/supabase/repositories/index.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:analytics");

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
    } catch (visitorError: unknown) {
      logger.error("Error tracking visitor: %o", visitorError instanceof Error ? visitorError : new Error(String(visitorError)));
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
  } catch (error: unknown) {
    logger.error("Unexpected error in POST /analytics/visitor: %o", error instanceof Error ? error : new Error(String(error)));
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
    } catch (visitorError: unknown) {
      logger.error("Error ensuring visitor exists: %o", visitorError instanceof Error ? visitorError : new Error(String(visitorError)));
    }

    let pageViewCreated = false;
    try {
      pageViewCreated = await createPageViewQuery(path, ip);
    } catch (pageViewError: unknown) {
      logger.error("Error creating page view: %o", pageViewError instanceof Error ? pageViewError : new Error(String(pageViewError)));
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
  } catch (error: unknown) {
    logger.error("Unexpected error in POST /analytics/visit: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to track visit",
    });
  }
});

export default router;

