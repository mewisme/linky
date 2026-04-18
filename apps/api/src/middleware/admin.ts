import type { NextFunction, Request, Response } from "express";

import { checkIfUserIsAdmin } from "@/infra/admin-cache/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";

import { toLoggableError } from "@/utils/to-loggable-error.js";
export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = createLogger("middleware:admin");
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", um("UNAUTHORIZED", "unauthorized", "Unauthorized"));
    }

    const isAdmin = await checkIfUserIsAdmin(clerkUserId);

    if (!isAdmin) {
      logger.warn("Non-admin user attempted to access admin route: %s", clerkUserId);
      return sendJsonError(res, 403, "Forbidden", um("FORBIDDEN_ADMIN", "adminAccessRequired", "Admin access required"));
    }

    logger.info("Admin access granted: %s for user: %s", isAdmin, clerkUserId);
    next();
  } catch (error) {
    logger.error(toLoggableError(error), "Admin middleware error");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("INTERNAL_SERVER_ERROR", "internalServerError", "Internal server error"),
    );
  }
}

