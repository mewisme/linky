import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getUserProfileAggregateByClerkUserId } from "@/domains/user/service/user-profile.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:profile:route");

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

    const profile = await getUserProfileAggregateByClerkUserId(clerkUserId);
    if (!profile) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    return res.json(profile);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-profile/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_PROFILE", "failedFetchUserProfile", "Failed to fetch user profile"),
    );
  }
});

export default router;
