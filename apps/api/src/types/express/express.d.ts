import type { Request } from "express";
import type { verifyToken } from "@clerk/backend";

declare global {
  namespace Express {
    interface Request {
      auth?: Awaited<ReturnType<typeof verifyToken>>;
      clientIp?: string;
      requestId?: string;
    }
  }
}

export { };

