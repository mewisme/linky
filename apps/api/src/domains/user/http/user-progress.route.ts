import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger/api";
import { getUserProgressInsights } from "../service/user-progress.service.js";
import { getUserIdByClerkUserId } from "../service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:User:Progress:Route");

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

    const progress = await getUserProgressInsights(userId);

    if (!progress) {
      return res.status(404).json({
        error: "Not Found",
        message: "User progress data not found",
      });
    }

    logger.info("User progress fetched for user: %s", userId);

    return res.json(progress);
  } catch (error) {
    logger.error("Unexpected error in GET /user-progress/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user progress",
    });
  }
});

export default router;
