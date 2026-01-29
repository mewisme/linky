import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import { getUserLevelData } from "../service/user-level.service.js";
import { getUserIdByClerkUserId } from "../service/user-settings.service.js";

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

    logger.info("User level fetched for user: %s", userId);

    return res.json(userLevel);
  } catch (error) {
    logger.error("Unexpected error in GET /user-level/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user level",
    });
  }
});

export default router;
