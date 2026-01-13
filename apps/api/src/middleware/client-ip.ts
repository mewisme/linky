import type { NextFunction, Request, Response } from "express";

function getClientIp(req: Request): string | null {
  const reqIp: string | undefined = req.ip;
  if (reqIp && typeof reqIp === "string") {
    const ipv4Match = reqIp.match(/(?::ffff:)?(\d+\.\d+\.\d+\.\d+)/);
    if (ipv4Match && ipv4Match[1]) {
      return ipv4Match[1];
    }
    return reqIp;
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

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

export function clientIpMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const clientIp = getClientIp(req);
  if (clientIp) {
    req.clientIp = clientIp;
  }
  next();
}

