import type { NextFunction, Request, Response } from "express";

import { Logger } from "../utils/logger.js";
import { checkIfUserIsAdmin } from "../lib/admin-cache.js";

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = new Logger("AdminMiddleware");
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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

