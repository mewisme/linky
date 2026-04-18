import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
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
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const { user, error } = await fetchUserByClerkUserId(clerkUserId);

    if (error) {
      logger.error(toLoggableError(error), "Error fetching user from database");

      if (error.code === "PGRST116") {
        return sendJsonError(
          res,
          404,
          "Not Found",
          um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
        );
      }

      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("FAILED_FETCH_USER_DATA", "failedFetchUserData", "Failed to fetch user data"),
      );
    }

    if (!user) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
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
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("UNEXPECTED_ERROR", "unexpectedError", "An unexpected error occurred"),
    );
  }
});

router.patch("/me/country", async (req: Request, res: Response) => {
  try {
    const { country, clerk_user_id } = req.body as UpdateUserCountryBody;

    if (!clerk_user_id) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    if (!country || typeof country !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("COUNTRY_REQUIRED", "countryRequiredString", "Country is required and must be a string"),
      );
    }

    const { user, error } = await updateUserCountryByClerkUserId(clerk_user_id, country);

    if (error) {
      logger.error(toLoggableError(error), "Error updating user country");
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("FAILED_UPDATE_COUNTRY", "failedUpdateUserCountry", "Failed to update user country"),
      );
    }

    if (!user) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    return res.json(user);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /users/me/country");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("UNEXPECTED_ERROR", "unexpectedError", "An unexpected error occurred"),
    );
  }
});

router.patch("/timezone", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const body = req.body as { timezone?: unknown };
    const tz = typeof body?.timezone === "string" ? body.timezone.trim() : "";
    if (!tz || !isValidTimezone(tz)) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("TIMEZONE_INVALID", "timezoneInvalidIana", "timezone must be a valid IANA timezone string"),
      );
    }

    const result = await setTimezoneOnceForUser(userId, tz);
    if ("alreadySet" in result && result.alreadySet) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("TIMEZONE_ALREADY_SET", "timezoneAlreadySet", "Timezone already set and cannot be changed"),
      );
    }

    return res.status(200).json({ timezone: tz });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /users/timezone");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("UNEXPECTED_ERROR", "unexpectedError", "An unexpected error occurred"),
    );
  }
});

export default router;

