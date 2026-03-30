import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { UpdateUserCountryBody } from "@/domains/user/types/user.types.js";
import {
  fetchUserByClerkUserId,
  tryUpdateUserCountryFromHeader,
  updateUserCountryByClerkUserId,
} from "@/domains/user/service/user.service.js";
import { setTimezoneOnceForUser } from "@/domains/user/service/user-details.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";
import { isValidTimezone } from "@/utils/timezone.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:users:route");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const { user, error } = await fetchUserByClerkUserId(clerkUserId);

    if (error) {
      logger.error(toLoggableError(error), "Error fetching user from database");

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
        const { updatedUser, updateError } = await tryUpdateUserCountryFromHeader(clerkUserId, countryHeader);

        if (updateError) {
          logger.error(toLoggableError(updateError), "Error updating user country");
        } else if (updatedUser) {
          return res.json(updatedUser);
        }
      }
    }

    return res.json(user);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /users/me");
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

    const { user, error } = await updateUserCountryByClerkUserId(clerk_user_id, country);

    if (error) {
      logger.error(toLoggableError(error), "Error updating user country");
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

    return res.json(user);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /users/me/country");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

router.patch("/timezone", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const body = req.body as { timezone?: unknown };
    const tz = typeof body?.timezone === "string" ? body.timezone.trim() : "";
    if (!tz || !isValidTimezone(tz)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "timezone must be a valid IANA timezone string",
      });
    }

    const result = await setTimezoneOnceForUser(userId, tz);
    if ("alreadySet" in result && result.alreadySet) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Timezone already set and cannot be changed",
      });
    }

    return res.status(200).json({ timezone: tz });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /users/timezone");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;

