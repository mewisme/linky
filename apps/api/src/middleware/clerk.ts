import type { NextFunction, Request, Response } from "express";

import { Logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { verifyToken } from "@clerk/backend";

export async function clerkMiddleware(req: Request, res: Response, next: NextFunction) {
  const logger = new Logger("ClerkMiddleware");
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
    logger.info("Clerk token verified for user:", payload.sub);

    req.auth = payload;
    next();
  } catch (error) {
    logger.error("Clerk token verification error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}