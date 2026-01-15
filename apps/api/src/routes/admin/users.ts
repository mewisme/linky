import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import type { TablesUpdate } from "../../types/database.types.js";
import { redisClient } from "../../lib/redis/client.js";
import { getUsers, getUserById, updateUser as updateUserQuery, patchUser as patchUserQuery } from "../../lib/supabase/queries/index.js";

const router: ExpressRouter = Router();
const logger = new Logger("AdminUsersRoute");

type UserUpdate = TablesUpdate<"users">;

/**
 * GET /api/v1/admin/users
 * Get all users with optional pagination and filtering
 * Query params: page, limit, role, allow, search, all
 * - If all=true or all=1, returns all users without pagination
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const getAll = req.query.all === "true" || req.query.all === "1";

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    const role = req.query.role as "admin" | "member" | undefined;
    const allow = req.query.allow !== undefined ? (req.query.allow === "true" || req.query.allow === "1") : undefined;
    const search = req.query.search as string | undefined;

    const { data: users, count } = await getUsers({
      page,
      limit,
      role: role === "admin" || role === "member" ? role : undefined,
      allow,
      search,
      getAll,
    });

    // Fetch presence from Redis for each user
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
            logger.warn("Error fetching presence from Redis:", presenceError instanceof Error ? presenceError.message : "Unknown error");
          }
        }
        return {
          ...user,
          presence,
        };
      })
    );

    // If getting all, return without pagination info
    if (getAll) {
      return res.json({
        data: usersWithPresence,
      });
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
    logger.error("Unexpected error in GET /admin/users:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch users",
    });
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get a specific user by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    // Fetch presence from Redis
    let presence = "offline";
    if (user.clerk_user_id) {
      try {
        const presenceState = await redisClient.hGet("presence", user.clerk_user_id);
        if (presenceState) {
          presence = presenceState;
        }
      } catch (presenceError) {
        logger.warn("Error fetching presence from Redis", {
          userId: user.id,
          clerkUserId: user.clerk_user_id,
          error: presenceError instanceof Error ? presenceError.message : "Unknown error",
        });
      }
    }

    return res.json({
      ...user,
      presence,
    });
  } catch (error: any) {
    logger.error("Unexpected error in GET /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");

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

/**
 * PUT /api/v1/admin/users/:id
 * Update a user (full update - replaces all fields)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: UserUpdate = req.body;

    const user = await updateUserQuery(id, userData);

    logger.info("User updated successfully:", id);
    return res.json(user);
  } catch (error: any) {
    logger.error("Unexpected error in PUT /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");

    if (error.message === "User not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error.message === "User with this clerk_user_id already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user",
    });
  }
});

/**
 * PATCH /api/v1/admin/users/:id
 * Partially update a user (only updates provided fields)
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: Partial<UserUpdate> = req.body;

    const user = await patchUserQuery(id, userData);

    logger.info("User updated successfully:", id);
    return res.json(user);
  } catch (error: any) {
    logger.error("Unexpected error in PATCH /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");

    if (error.message === "User not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error.message === "User with this clerk_user_id already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user",
    });
  }
});

export default router;

