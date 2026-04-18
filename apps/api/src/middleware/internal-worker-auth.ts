import { timingSafeEqual } from "node:crypto";

import { type NextFunction, type Request, type Response } from "express";

import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
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
    sendJsonError(
      res,
      503,
      "ServiceUnavailable",
      um("INTERNAL_WORKER_NOT_CONFIGURED", "internalWorkerNotConfigured", "Internal worker API is not configured"),
    );
    return;
  }

  const raw = req.headers.authorization;
  if (typeof raw !== "string" || !raw.startsWith("Bearer ")) {
    sendJsonError(
      res,
      401,
      "Unauthorized",
      um("MISSING_AUTH_HEADER", "missingAuthHeader", "Missing or invalid Authorization header"),
    );
    return;
  }

  const token = raw.slice("Bearer ".length).trim();
  if (!safeEqualStrings(token, secret)) {
    sendJsonError(res, 401, "Unauthorized", um("INVALID_CREDENTIALS", "invalidCredentials", "Invalid credentials"));
    return;
  }

  next();
}
