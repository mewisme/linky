import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger/api";
import { getUserStreakData, getUserStreakHistory } from "../service/user-streak.service.js";
import { getUserIdByClerkUserId } from "../service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:User:Streak:Route");

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

    const userStreak = await getUserStreakData(userId);

    if (!userStreak) {
      return res.status(404).json({
        error: "Not Found",
        message: "User streak data not found",
      });
    }

    logger.info("User streak fetched for user: %s", userId);

    return res.json(userStreak);
  } catch (error) {
    logger.error("Unexpected error in GET /user-streak/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user streak",
    });
  }
});

router.get("/me/history", async (req: Request, res: Response) => {
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

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Limit must be between 1 and 100",
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Offset must be a non-negative number",
      });
    }

    const result = await getUserStreakHistory(userId, { limit, offset });

    logger.info("User streak history fetched for user: %s", userId);

    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /user-streak/me/history: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user streak history",
    });
  }
});

export default router;
