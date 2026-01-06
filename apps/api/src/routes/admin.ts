import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../lib/supabase/client.js";
import { logger } from "../utils/logger.js";
import type { TablesUpdate } from "../types/database.types.js";
import { redisClient } from "../lib/redis/client.js";

const router: ExpressRouter = Router();

type UserUpdate = TablesUpdate<"users">;

/**
 * GET /api/v1/admin/users
 * Get all users with optional pagination and filtering
 * Query params: page, limit, role, allow, search, all
 * - If all=true or all=1, returns all users without pagination
 */
router.get("/users", async (req: Request, res: Response) => {
  try {
    const getAll = req.query.all === "true" || req.query.all === "1";

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    let query = supabase
      .from("users")
      .select("*", { count: "exact" });

    // Filter by role
    if (req.query.role) {
      const role = req.query.role as string;
      if (role === "admin" || role === "member") {
        query = query.eq("role", role);
      }
    }

    // Filter by allow status
    if (req.query.allow !== undefined) {
      const allow = req.query.allow === "true" || req.query.allow === "1";
      query = query.eq("allow", allow);
    }

    // Search by email, first_name, or last_name
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      query = query.or(
        `email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
      );
    }

    // Order by created_at descending (newest first)
    query = query.order("created_at", { ascending: false });

    // Apply pagination only if not getting all
    if (!getAll) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: users, error, count } = await query;

    if (error) {
      logger.error("Error fetching users:", error.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch users",
      });
    }

    // Fetch presence from Redis for each user
    const usersWithPresence = await Promise.all(
      (users || []).map(async (user) => {
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
      message: "An unexpected error occurred",
    });
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get a specific user by ID
 */
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching user:", error.message);

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
  } catch (error) {
    logger.error("Unexpected error in GET /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * PUT /api/v1/admin/users/:id
 * Update a user (full update - replaces all fields)
 */
router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: UserUpdate = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    // If clerk_user_id is being updated, check for conflicts
    if (userData.clerk_user_id) {
      const { data: conflictUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", userData.clerk_user_id)
        .neq("id", id)
        .single();

      if (conflictUser) {
        return res.status(409).json({
          error: "Conflict",
          message: "User with this clerk_user_id already exists",
        });
      }
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(userData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating user:", error.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update user",
      });
    }

    logger.info("User updated successfully:", id);
    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in PUT /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * PATCH /api/v1/admin/users/:id
 * Partially update a user (only updates provided fields)
 */
router.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user ID",
      });
    }
    const userData: Partial<UserUpdate> = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    // If clerk_user_id is being updated, check for conflicts
    if (userData.clerk_user_id) {
      const { data: conflictUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", userData.clerk_user_id)
        .neq("id", id)
        .single();

      if (conflictUser) {
        return res.status(409).json({
          error: "Conflict",
          message: "User with this clerk_user_id already exists",
        });
      }
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(userData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating user:", error.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update user",
      });
    }

    logger.info("User updated successfully:", id);
    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in PATCH /admin/users/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;