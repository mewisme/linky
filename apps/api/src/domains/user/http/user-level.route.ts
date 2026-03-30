import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getUserLevelData } from "@/domains/user/service/user-level.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:level:route");

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

    const userLevel = await getUserLevelData(userId);

    if (!userLevel) {
      return res.status(404).json({
        error: "Not Found",
        message: "User level data not found",
      });
    }

    return res.json(userLevel);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-level/me");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user level",
    });
  }
});

export default router;
