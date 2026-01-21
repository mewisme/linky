import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingRequestId = req.headers["x-request-id"] as string | undefined;
  const requestId = existingRequestId || randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
