import type { NextFunction, Request, Response } from "express";

import { checkIfUserIsAdmin } from "../lib/admin-cache.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware to check if the authenticated user has admin role
 * Must be used after clerkMiddleware
 * Uses admin cache to avoid frequent database queries
 */
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check admin status using cache
    const isAdmin = await checkIfUserIsAdmin(clerkUserId);

    if (!isAdmin) {
      logger.warn("Non-admin user attempted to access admin route:", clerkUserId);
      return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    }

    logger.info("Admin access granted:", clerkUserId);
    next();
  } catch (error) {
    logger.error("Admin middleware error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

