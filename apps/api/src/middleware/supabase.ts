import { Request, Response } from 'express';

import { Logger } from '../utils/logger.js';
import { NextFunction } from 'express';
import { config } from '../config/index.js';
import { verifySupabaseAuthJWT } from '../lib/jwt/verify.js';

const logger = new Logger("SupabaseMiddleware");

export async function supabaseMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const { payload } = await verifySupabaseAuthJWT(token);
    logger.info("Supabase token verified for user:", payload.sub);
    req.supabaseUser = payload;
    next();
  } catch (error) {
    logger.error("Supabase token verification error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}