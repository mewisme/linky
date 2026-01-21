import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger/api";
import type { UpdateUserCountryBody } from "../types/user.types.js";
import {
  fetchUserByClerkUserId,
  tryUpdateUserCountryFromHeader,
  updateUserCountryByClerkUserId,
} from "../service/user.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:User:Users:Route");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    logger.info("Fetching user data: %s", clerkUserId);

    const { user, error } = await fetchUserByClerkUserId(clerkUserId);

    if (error) {
      logger.error("Error fetching user from database: %o", error instanceof Error ? error : new Error(String(error)));

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

    if (!user.country) {
      const countryHeader = req.headers["cf-ipcountry"] || req.headers["x-cf-ipcountry"];

      if (countryHeader && typeof countryHeader === "string") {
        logger.info("Updating user country from header: %s", countryHeader);

        const { updatedUser, updateError } = await tryUpdateUserCountryFromHeader(clerkUserId, countryHeader);

        if (updateError) {
          logger.error("Error updating user country: %o", updateError instanceof Error ? updateError : new Error(String(updateError)));
        } else if (updatedUser) {
          logger.info("User country updated successfully: %s", countryHeader);
          return res.json(updatedUser);
        }
      }
    }

    logger.info("User data fetched successfully: %s", user.id);

    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in GET /users/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

router.patch("/me/country", async (req: Request, res: Response) => {
  try {
    const { country, clerk_user_id } = req.body as UpdateUserCountryBody;

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

    logger.info("Updating user country: %s %s", clerk_user_id, country);

    const { user, error } = await updateUserCountryByClerkUserId(clerk_user_id, country);

    if (error) {
      logger.error("Error updating user country: %o", error instanceof Error ? error : new Error(String(error)));
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

    logger.info("User country updated successfully: %s", user.id);

    return res.json(user);
  } catch (error) {
    logger.error("Unexpected error in PATCH /users/me/country: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;

