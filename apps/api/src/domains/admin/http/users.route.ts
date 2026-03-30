import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { AdminUserUpdate } from "@/domains/admin/types/admin.types.js";
import { redisClient } from "@/infra/redis/client.js";
import {
  getUser,
  hardDeleteUser,
  hardDeleteUsers,
  listUsers,
  patchAdminUser,
  patchAdminUsers,
  updateAdminUser,
} from "@/domains/admin/service/admin-users.service.js";
import { requireSuperAdmin } from "@/lib/auth/role-guard.js";
import {
  assertCannotAssignSuperadmin,
  assertCanHardDeleteTarget,
  assertTargetCanBeSoftDeleted,
  assertTargetNotSuperadmin,
} from "@/lib/auth/superadmin-invariants.js";
import { getUserByClerkId } from "@/infra/supabase/repositories/index.js";
import { parseGetUsersQuery } from "../helper/users-query.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:users:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const { getAll, page, limit, role, deleted, search } = parseGetUsersQuery(req.query);

    const { data: users, count } = await listUsers({
      getAll,
      page,
      limit,
      role,
      deleted,
      search,
    });

    const usersWithPresence =
      deleted
        ? (users || []).map((user: any) => ({ ...user, presence: "offline" }))
        : await Promise.all(
          (users || []).map(async (user: any) => {
            let presence = "offline";
            if (user.clerk_user_id) {
              try {
                const presenceState = await redisClient.hGet("presence", user.clerk_user_id);
                if (presenceState) presence = presenceState;
              } catch (presenceError: unknown) {
                logger.warn(toLoggableError(presenceError), "Error fetching presence from Redis");
              }
            }
            return { ...user, presence };
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
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/users");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch users",
    });
  }
});

router.patch("/batch", async (req: Request, res: Response) => {
  try {
    const body = req.body as { ids?: string[]; deleted?: boolean; deleted_at?: string | null };
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "ids must be a non-empty array",
      });
    }
    const userData: Partial<AdminUserUpdate> = {};
    if (typeof body.deleted === "boolean") userData.deleted = body.deleted;
    if (body.deleted_at !== undefined) userData.deleted_at = body.deleted_at;
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "At least one of deleted or deleted_at must be provided",
      });
    }

    const users = await patchAdminUsers(ids, userData);
    return res.json({ data: users });
  } catch (error: unknown) {
    const err = toLoggableError(error);
    logger.error(err, "Unexpected error in PATCH /admin/users/batch");
    if (
      err.message === "Cannot assign superadmin role via API"
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: err.message,
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to batch update users",
    });
  }
});

router.delete("/batch", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body as { ids?: string[] };
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "ids must be a non-empty array",
      });
    }

    await hardDeleteUsers(ids);
    return res.json({ success: true, message: "Users deleted successfully" });
  } catch (error: unknown) {
    const err = toLoggableError(error);
    logger.error(err, "Unexpected error in DELETE /admin/users/batch");

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
      message: "Failed to batch delete users",
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
      } catch (presenceError: unknown) {
        logger.warn(toLoggableError(presenceError), "Error fetching presence from Redis");
      }
    }

    return res.json({
      ...user,
      presence,
    });
  } catch (error: any) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/users/:id");

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
    const err = toLoggableError(error);
    logger.error(err, "Unexpected error in PUT /admin/users/:id");

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
    const err = toLoggableError(error);
    logger.error(err, "Unexpected error in PATCH /admin/users/:id");

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
    const err = toLoggableError(error);
    logger.error(err, "Unexpected error in DELETE /admin/users/:id");

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

