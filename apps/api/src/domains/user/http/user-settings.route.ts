import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../../utils/logger.js";
import type { UserSettingsUpdate } from "../types/user-settings.types.js";
import {
  fetchUserSettings,
  getUserIdByClerkUserId,
  patchUserSettingsForUser,
  putUserSettings,
} from "../service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = new Logger("UserSettingsRoute");

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

    const userSettings = await fetchUserSettings(userId);

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

    const userSettings = await fetchUserSettings(userId);

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

