import type { NextFunction, Request, Response } from "express";
import { getAdminRole } from "@/infra/admin-cache/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";

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
    sendJsonError(res, 401, "Unauthorized", um("UNAUTHORIZED", "unauthorized", "Unauthorized"));
    return;
  }
  const role = await getAdminRole(clerkUserId);
  if (role !== "superadmin") {
    sendJsonError(
      res,
      403,
      "Forbidden",
      um("SUPERADMIN_REQUIRED", "superadminRequired", "Superadmin access required"),
    );
    return;
  }
  next();
}
