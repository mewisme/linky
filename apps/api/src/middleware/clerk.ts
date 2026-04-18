import type { NextFunction, Request, Response } from "express";

import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { verifyToken } from "@clerk/backend";

export async function clerkMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = createLogger("middleware:clerk");
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn("No authorization header provided");
      return sendJsonError(res, 401, "Unauthorized", um("UNAUTHORIZED", "unauthorized", "Unauthorized"));
    }
    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });
    logger.info("Clerk token verified for user: %s", payload.sub);

    req.auth = payload;
    next();
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Clerk token verification error");
    return sendJsonError(res, 401, "Unauthorized", um("UNAUTHORIZED", "unauthorized", "Unauthorized"));
  }
}