import type { NextFunction, Request, Response } from "express";
import { getAdminRole } from "@/infra/admin-cache/index.js";

export function requireAdmin(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clerkUserId = req.auth?.sub;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const role = await getAdminRole(clerkUserId);
  if (role !== "superadmin") {
    res.status(403).json({
      error: "Forbidden",
      message: "Superadmin access required",
    });
    return;
  }
  next();
}
