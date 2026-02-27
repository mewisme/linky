import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import type { AdminUserUpdate } from "@/domains/admin/types/admin.types.js";
import { redisClient } from "@/infra/redis/client.js";
import { getUser, hardDeleteUser, listUsers, patchAdminUser, updateAdminUser } from "@/domains/admin/service/admin-users.service.js";
import { requireSuperAdmin } from "@/lib/auth/role-guard.js";
import {
  assertCannotAssignSuperadmin,
  assertCanHardDeleteTarget,
  assertTargetCanBeSoftDeleted,
  assertTargetNotSuperadmin,
} from "@/lib/auth/superadmin-invariants.js";
import { getUserByClerkId } from "@/infra/supabase/repositories/index.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:users:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const getAll = req.query.all === "true" || req.query.all === "1";

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const role = req.query.role as "admin" | "member" | "superadmin" | undefined;
    const deletedParam = req.query.deleted;
    const deleted =
      deletedParam === "true" || deletedParam === "1"
        ? true
        : deletedParam === "false" || deletedParam === "0"
          ? false
          : undefined;
    const search = req.query.search as string | undefined;

    const { data: users, count } = await listUsers({
      getAll,
      page,
      limit,
      role: role === "admin" || role === "member" || role === "superadmin" ? role : undefined,
      deleted,
      search,
    });

    const usersWithPresence = await Promise.all(
      (users || []).map(async (user: any) => {
        let presence = "offline";
        if (user.clerk_user_id) {
          try {
            const presenceState = await redisClient.hGet("presence", user.clerk_user_id);
            if (presenceState) {
              presence = presenceState;
            }
          } catch (presenceError) {
            logger.warn(
              "Error fetching presence from Redis: %o",
              presenceError instanceof Error ? presenceError : new Error(String(presenceError)),
            );
          }
        }
        return {
          ...user,
          presence,
        };
      }),
    );

    if (getAll) {
      return res.json({ data: usersWithPresence });
    }

    return res.json({
      data: usersWithPresence,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/users: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch users",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }

    const user = await getUser(id);

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    let presence = "offline";
    if ((user as any).clerk_user_id) {
      try {
        const presenceState = await redisClient.hGet("presence", (user as any).clerk_user_id);
        if (presenceState) {
          presence = presenceState;
        }
      } catch (presenceError) {
        logger.warn("Error fetching presence from Redis: %o", presenceError instanceof Error ? presenceError : new Error(String(presenceError)));
      }
    }

    return res.json({
      ...user,
      presence,
    });
  } catch (error: any) {
    logger.error("Unexpected error in GET /admin/users/:id: %o", error as Error);

    if (error.code === "PGRST116") {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: AdminUserUpdate = req.body;

    const target = await getUser(id);
    if (!target) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }
    assertTargetNotSuperadmin((target as { role: string }).role);
    assertCannotAssignSuperadmin(userData.role);

    const user = await updateAdminUser(id, userData);

    return res.json(user);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Unexpected error in PUT /admin/users/:id: %o", err);

    if (err.message === "User not found") {
      return res.status(404).json({
        error: "Not Found",
        message: err.message,
      });
    }
    if (err.message === "Superadmin users cannot be modified" || err.message === "Cannot assign superadmin role via API") {
      return res.status(403).json({
        error: "Forbidden",
        message: err.message,
      });
    }
    if (err.message === "User with this clerk_user_id already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: err.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: Partial<AdminUserUpdate> = { ...req.body };
    if (userData.deleted === true && userData.deleted_at == null) {
      userData.deleted_at = new Date().toISOString();
    }

    const target = await getUser(id);
    if (!target) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }
    const targetRole = (target as { role: string }).role;
    assertTargetNotSuperadmin(targetRole);
    assertCannotAssignSuperadmin(userData.role);
    if (userData.deleted === true) {
      assertTargetCanBeSoftDeleted(targetRole);
    }

    const user = await patchAdminUser(id, userData);

    return res.json(user);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Unexpected error in PATCH /admin/users/:id: %o", err);

    if (err.message === "User not found") {
      return res.status(404).json({
        error: "Not Found",
        message: err.message,
      });
    }
    if (
      err.message === "Superadmin users cannot be modified" ||
      err.message === "Cannot assign superadmin role via API" ||
      err.message === "Superadmin users cannot be soft deleted"
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: err.message,
      });
    }
    if (err.message === "User with this clerk_user_id already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: err.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user",
    });
  }
});

router.delete("/:id", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }

    const target = await getUser(id);
    if (!target) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const actingUser = await getUserByClerkId(clerkUserId);
    if (!actingUser) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Acting user not found",
      });
    }
    const targetRole = (target as { role: string }).role;
    const targetId = (target as { id: string }).id;
    assertCanHardDeleteTarget(targetRole, targetId, actingUser.id);

    await hardDeleteUser(id);

    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error("Unexpected error in DELETE /admin/users/:id: %o", err);

    if (err.message === "User not found") {
      return res.status(404).json({
        error: "Not Found",
        message: err.message,
      });
    }
    if (
      err.message === "Superadmin users cannot be deleted" ||
      err.message === "Cannot hard delete yourself" ||
      err.message === "Admin users cannot be deleted"
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: err.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete user",
    });
  }
})

export default router;

