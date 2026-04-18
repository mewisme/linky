import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { UserSettingsUpdate } from "@/domains/user/types/user-settings.types.js";
import {
  fetchUserSettings,
  getUserIdByClerkUserId,
  patchUserSettingsForUser,
  putUserSettings,
} from "@/domains/user/service/user-settings.service.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:settings:route");

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

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const userSettings = await getCachedData(
      CACHE_KEYS.userSettings(userId),
      async () => {
        const userSettings = await fetchUserSettings(userId);
        if (!userSettings) {
          throw new Error("User settings not found");
        }
        return userSettings;
      },
      CACHE_TTL.USER_SETTINGS
    );

    return res.json(userSettings);
  } catch (error) {
    if (error instanceof Error && error.message === "User settings not found") {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_SETTINGS_NOT_FOUND", "userSettingsNotFound", "User settings not found"),
      );
    }

    logger.error(toLoggableError(error), "Unexpected error in GET /user-settings/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_SETTINGS", "failedFetchUserSettings", "Failed to fetch user settings"),
    );
  }
});

router.put("/me", async (req: Request, res: Response) => {
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

    const userData: UserSettingsUpdate = req.body;

    const { user_id, ...updateData } = userData;

    const result = await putUserSettings(userId, updateData);

    await invalidateCacheKey(CACHE_KEYS.userSettings(userId));

    logger.info("User settings updated for user: %s", userId);

    return res.json(result);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /user-settings/me");

    if (error instanceof Error && error.message === "User settings not found") {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return sendJsonError(res, 404, "Not Found", umDetail("SETTINGS_NOT_FOUND", msg));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_SETTINGS", "failedUpdateUserSettings", "Failed to update user settings"),
    );
  }
});

router.patch("/me", async (req: Request, res: Response) => {
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

    const userData: Partial<UserSettingsUpdate> = req.body;

    const { user_id, ...updateData } = userData;

    await patchUserSettingsForUser(userId, updateData);

    await invalidateCacheKey(CACHE_KEYS.userSettings(userId));

    const userSettings = await fetchUserSettings(userId);

    return res.json(userSettings);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /user-settings/me");

    if (error instanceof Error && error.message === "User settings not found") {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return sendJsonError(res, 404, "Not Found", umDetail("SETTINGS_NOT_FOUND_PATCH", msg));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_SETTINGS_PATCH", "failedUpdateUserSettings", "Failed to update user settings"),
    );
  }
});

export default router;
