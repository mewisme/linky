import type { NextFunction, Request, Response } from "express";

import { checkIfUserIsAdmin } from "@/infra/admin-cache/index.js";
import { createLogger } from "@/utils/logger.js";

import { toLoggableError } from "@/utils/to-loggable-error.js";
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = createLogger("middleware:admin");
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = await checkIfUserIsAdmin(clerkUserId);

    if (!isAdmin) {
      logger.warn("Non-admin user attempted to access admin route: %s", clerkUserId);
      return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    }

    logger.info("Admin access granted: %s for user: %s", isAdmin, clerkUserId);
    next();
  } catch (error) {
    logger.error(toLoggableError(error), "Admin middleware error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

