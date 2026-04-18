import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserProgressInsights } from "@/domains/user/service/user-progress.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:progress:route");

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

    const timezone = await getTimezoneForUser(userId);
    const progress = await getUserProgressInsights(userId, timezone);

    if (!progress) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_PROGRESS_NOT_FOUND", "userProgressNotFound", "User progress data not found"),
      );
    }

    return res.json(progress);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-progress/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_PROGRESS", "failedFetchUserProgress", "Failed to fetch user progress"),
    );
  }
});

export default router;
