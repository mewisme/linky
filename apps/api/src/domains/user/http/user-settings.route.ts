import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import type { UserSettingsUpdate } from "../types/user-settings.types.js";
import {
  fetchUserSettings,
  getUserIdByClerkUserId,
  patchUserSettingsForUser,
  putUserSettings,
} from "../service/user-settings.service.js";
import { getCachedData, invalidateCacheKey } from "../../../infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "../../../infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:settings:route");

router.get("/me", async (req: Request, res: Response) => {
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
      return res.status(404).json({
        error: "Not Found",
        message: "User settings not found",
      });
    }

    logger.error("Unexpected error in GET /user-settings/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user settings",
    });
  }
});

router.put("/me", async (req: Request, res: Response) => {
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

    const userData: UserSettingsUpdate = req.body;

    const { user_id, ...updateData } = userData;

    const result = await putUserSettings(userId, updateData);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userSettings(userId));

    logger.info("User settings updated for user: %s", userId);

    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in PUT /user-settings/me: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message === "User settings not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user settings",
    });
  }
});

router.patch("/me", async (req: Request, res: Response) => {
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

    const userData: Partial<UserSettingsUpdate> = req.body;

    const { user_id, ...updateData } = userData;

    await patchUserSettingsForUser(userId, updateData);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userSettings(userId));

    const userSettings = await fetchUserSettings(userId);

    return res.json(userSettings);
  } catch (error) {
    logger.error("Unexpected error in PATCH /user-settings/me: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message === "User settings not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user settings",
    });
  }
});

export default router;

