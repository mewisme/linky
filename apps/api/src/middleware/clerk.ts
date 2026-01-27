import type { NextFunction, Request, Response } from "express";

import { config } from "../config/index.js";
import { createLogger } from "@repo/logger";
import { verifyToken } from "@clerk/backend";

export async function clerkMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = createLogger("API:Clerk:Middleware");
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn("No authorization header provided");
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });
    logger.info("Clerk token verified for user: %s", payload.sub);

    req.auth = payload;
    next();
  } catch (error: unknown) {
    logger.error("Clerk token verification error: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(401).json({ error: "Unauthorized" });
  }
}