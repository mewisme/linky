import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../../lib/supabase/client.js";
import { logger } from "../../utils/logger.js";

const router: ExpressRouter = Router();

/**
 * GET /api/v1/users/me
 * Get current user
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

    logger.info("Fetching user data:", clerkUserId);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error) {
      logger.error("Error fetching user from database:", error.message);

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

    // Auto-update country from header if not set
    if (!user.country) {
      const countryHeader = req.headers["cf-ipcountry"] || req.headers["x-cf-ipcountry"];

      if (countryHeader && typeof countryHeader === "string") {
        logger.info("Updating user country from header:", countryHeader);

        const { error: updateError } = await supabase
          .from("users")
          .update({
            country: countryHeader,
            updated_at: new Date().toISOString()
          })
          .eq("clerk_user_id", clerkUserId);

        if (updateError) {
          logger.error("Error updating user country:", updateError.message);
        } else {
          const { data: updatedUser } = await supabase
            .from("users")
            .select("*")
            .eq("clerk_user_id", clerkUserId)
            .single();

          if (updatedUser) {
            logger.info("User country updated successfully:", countryHeader);
            return res.json(updatedUser);
          }
        }
      }
    }

    logger.info("User data fetched successfully:", user.id);

    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in GET /users/me:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * PATCH /api/v1/users/me/country
 * Update current user's country
 */
router.patch("/me/country", async (req: Request, res: Response) => {
  try {
    const { country, clerk_user_id } = req.body;

    if (!clerk_user_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    if (!country || typeof country !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Country is required and must be a string",
      });
    }

    logger.info("Updating user country:", { clerk_user_id, country });

    const { data: user, error } = await supabase
      .from("users")
      .update({
        country: country,
        updated_at: new Date().toISOString()
      })
      .eq("clerk_user_id", clerk_user_id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating user country:", error.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update user country",
      });
    }

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    logger.info("User country updated successfully:", user.id);

    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in PATCH /users/me/country:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;
