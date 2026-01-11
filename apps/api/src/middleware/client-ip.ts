import type { NextFunction, Request, Response } from "express";

/**
 * Extract client IP address from request
 * Works with trust proxy enabled to get the real client IP
 */
function getClientIp(req: Request): string | null {
  // With trust proxy enabled, req.ip should contain the real client IP
  // from X-Forwarded-For header
  const reqIp: string | undefined = req.ip;
  if (reqIp && typeof reqIp === "string") {
    // req.ip might contain IPv6 format like "::ffff:192.168.1.1"
    // Extract IPv4 if present
    const ipv4Match = reqIp.match(/(?::ffff:)?(\d+\.\d+\.\d+\.\d+)/);
    if (ipv4Match && ipv4Match[1]) {
      return ipv4Match[1];
    }
    // At this point, reqIp is confirmed to be a string
    return reqIp;
  }

  // Fallback to socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Last resort: check X-Forwarded-For header manually
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? (forwardedFor[0] ?? forwardedFor.join(",")) : forwardedFor;
    if (ips) {
      const firstIp = ips.split(",")[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }
  }

  return null;
}

/**
 * Middleware to extract and set client IP address on request object
 * Sets req.clientIp for use in route handlers
 * Works with trust proxy enabled to get the real client IP
 */
export function clientIpMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const clientIp = getClientIp(req);
  if (clientIp) {
    req.clientIp = clientIp;
  }
  next();
}

