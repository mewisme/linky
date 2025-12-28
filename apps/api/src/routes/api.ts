import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../lib/supabase/client.js";
import { logger } from "../utils/logger.js";
import locketsRouter from "./lockets.js";

const router: ExpressRouter = Router();

// Example API routes
router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API routes" });
});

/**
 * GET /api/v1/me
 * Get current user information from database
 * Requires authentication via clerkMiddleware
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    logger.info("Fetching user data", { clerkUserId });

    // Query user from database by clerk_user_id
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error) {
      logger.error("Error fetching user from database", { error, clerkUserId });

      // If user not found, return 404
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Not Found",
          message: "User not found in database",
        });
      }

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch user data",
      });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    logger.info("User data fetched successfully", { userId: user.id, clerkUserId });

    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in /me endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

// Mount lockets routes
router.use("/lockets", locketsRouter);

export default router;

