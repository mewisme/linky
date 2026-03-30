import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getUserProfileAggregateByClerkUserId } from "@/domains/user/service/user-profile.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:profile:route");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const profile = await getUserProfileAggregateByClerkUserId(clerkUserId);
    if (!profile) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    return res.json(profile);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-profile/me");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user profile",
    });
  }
});

export default router;

