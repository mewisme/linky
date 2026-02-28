import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserProgressInsights } from "@/domains/user/service/user-progress.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:progress:route");

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

    const timezone = await getTimezoneForUser(userId);
    const progress = await getUserProgressInsights(userId, timezone);

    if (!progress) {
      return res.status(404).json({
        error: "Not Found",
        message: "User progress data not found",
      });
    }

    return res.json(progress);
  } catch (error) {
    logger.error("Unexpected error in GET /user-progress/me: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user progress",
    });
  }
});

export default router;
