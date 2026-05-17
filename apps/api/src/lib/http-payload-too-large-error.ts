import type { Response } from "express";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";

export function isPayloadTooLargeError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const e = err as { type?: string; status?: number; statusCode?: number };
  return e.type === "entity.too.large" || e.status === 413 || e.statusCode === 413;
}

export function sendPayloadTooLargeError(res: Response): void {
  const limit = config.jsonBodySizeLimit;
  const fallback = `Request body exceeds size limit of ${limit}`;
  sendJsonError(res, 413, "Payload Too Large", um("PAYLOAD_TOO_LARGE", "payloadTooLarge", fallback, { limit }));
}
