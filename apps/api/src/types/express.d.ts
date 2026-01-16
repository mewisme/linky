import type { Request } from "express";
import type { verifyToken } from "@clerk/backend";
import { verifySupabaseAuthJWT } from "../lib/jwt/verify.js";

declare global {
  namespace Express {
    interface Request {
      auth?: Awaited<ReturnType<typeof verifyToken>>;
      supabaseUser?: Awaited<ReturnType<typeof verifySupabaseAuthJWT>>['payload'];
      clientIp?: string;
    }
  }
}

export { };

