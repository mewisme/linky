import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserStreakData, getUserStreakHistory, getUserStreakCalendar } from "@/domains/user/service/user-streak.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:streak:route");

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

    const userStreak = await getUserStreakData(userId);

    if (!userStreak) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_STREAK_NOT_FOUND", "userStreakNotFound", "User streak data not found"),
      );
    }

    return res.json(userStreak);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-streak/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_STREAK", "failedFetchUserStreak", "Failed to fetch user streak"),
    );
  }
});

router.get("/me/history", async (req: Request, res: Response) => {
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

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("STREAK_LIMIT_RANGE", "limitBetween1And100", "Limit must be between 1 and 100"),
      );
    }

    if (isNaN(offset) || offset < 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("STREAK_OFFSET_NONNEG", "offsetNonNegative", "Offset must be a non-negative number"),
      );
    }

    const result = await getUserStreakHistory(userId, { limit, offset });

    return res.json(result);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-streak/me/history");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_STREAK_HISTORY", "failedFetchStreakHistory", "Failed to fetch user streak history"),
    );
  }
});

router.get("/calendar", async (req: Request, res: Response) => {
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

    const year = req.query.year ? parseInt(String(req.query.year), 10) : null;
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;

    if (year === null || isNaN(year)) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("YEAR_QUERY_REQUIRED", "yearQueryRequired", "Year query parameter is required and must be a number"),
      );
    }

    if (month === null || isNaN(month)) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("MONTH_QUERY_REQUIRED", "monthQueryRequired", "Month query parameter is required and must be a number"),
      );
    }

    if (month < 1 || month > 12) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("MONTH_RANGE", "monthBetween1And12", "Month must be between 1 and 12"),
      );
    }

    const timezone = await getTimezoneForUser(userId);
    const calendarData = await getUserStreakCalendar(userId, year, month, timezone);

    return res.json(calendarData);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /user-streak/calendar");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_STREAK_CAL", "failedFetchStreakCalendar", "Failed to fetch user streak calendar"),
    );
  }
});

export default router;
