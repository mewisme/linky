import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import type { TablesUpdate } from "../../types/database.types.js";
import {
  getUserSettingsByUserId,
  createUserSettings,
  updateUserSettings,
  patchUserSettings,
} from "../../lib/supabase/queries/user-settings.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";

const router: ExpressRouter = Router();
const logger = new Logger("UserSettingsRoute");

type UserSettingsUpdate = TablesUpdate<"user_settings">;

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userSettings = await getUserSettingsByUserId(userId);

    if (!userSettings) {
      return res.status(404).json({
        error: "Not Found",
        message: "User settings not found",
      });
    }

    logger.info("User settings fetched for user:", userId);

    return res.json(userSettings);
  } catch (error) {
    logger.error("Unexpected error in GET /user-settings/me:", error instanceof Error ? error.message : "Unknown error");
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userData: UserSettingsUpdate = req.body;

    const { user_id, ...updateData } = userData;

    const existing = await getUserSettingsByUserId(userId);
    let result;

    if (!existing) {
      result = await createUserSettings(userId, updateData);
    } else {
      result = await updateUserSettings(userId, updateData);
    }

    logger.info("User settings updated for user:", userId);

    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in PUT /user-settings/me:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message === "User settings not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userData: Partial<UserSettingsUpdate> = req.body;

    const { user_id, ...updateData } = userData;

    const existing = await getUserSettingsByUserId(userId);

    if (!existing) {
      await createUserSettings(userId, updateData);
    } else {
      await patchUserSettings(userId, updateData);
    }

    const userSettings = await getUserSettingsByUserId(userId);

    logger.info("User settings patched for user:", userId);

    return res.json(userSettings);
  } catch (error) {
    logger.error("Unexpected error in PATCH /user-settings/me:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message === "User settings not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user settings",
    });
  }
});

export default router;
