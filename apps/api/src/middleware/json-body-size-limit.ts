import { type Request, type Response, type NextFunction } from "express";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("middleware:json-body-size-limit");

export function jsonBodySizeLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("application/json")) {
    next();
    return;
  }

  const contentLength = req.headers["content-length"];
  if (!contentLength) {
    next();
    return;
  }

  const sizeLimitBytes = parseSizeLimit(config.jsonBodySizeLimit);
  const requestSizeBytes = parseInt(contentLength, 10);

  if (requestSizeBytes > sizeLimitBytes) {
    logger.warn("Request body too large: %d bytes (limit: %d bytes)", requestSizeBytes, sizeLimitBytes);
    const limit = config.jsonBodySizeLimit;
    const fallback = `Request body exceeds size limit of ${limit}`;
    sendJsonError(res, 413, "Payload Too Large", um("PAYLOAD_TOO_LARGE", "payloadTooLarge", fallback, { limit }));
    return;
  }

  next();
}

function parseSizeLimit(limit: string | undefined): number {
  if (!limit) {
    return 500 * 1024;
  }

  const units: Record<string, number> = {
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = limit.toLowerCase().match(/^(\d+)(kb|mb|gb)$/);
  if (!match || !match[1] || !match[2]) {
    return 500 * 1024;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multiplier = units[unit];
  if (!multiplier) {
    return 500 * 1024;
  }
  return value * multiplier;
}
