import { timingSafeEqual } from "node:crypto";

import { type NextFunction, type Request, type Response } from "express";

import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("api:middleware:internal-worker-auth");

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function internalWorkerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = config.internalWorkerSecret;
  if (!secret) {
    logger.error("INTERNAL_WORKER_SECRET is not configured");
    res.status(503).json({
      error: "ServiceUnavailable",
      message: "Internal worker API is not configured",
    });
    return;
  }

  const raw = req.headers.authorization;
  if (typeof raw !== "string" || !raw.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header",
    });
    return;
  }

  const token = raw.slice("Bearer ".length).trim();
  if (!safeEqualStrings(token, secret)) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid credentials",
    });
    return;
  }

  next();
}
