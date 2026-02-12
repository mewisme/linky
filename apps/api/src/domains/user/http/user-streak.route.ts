import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { getUserStreakData, getUserStreakHistory, getUserStreakCalendar } from "@/domains/user/service/user-streak.service.js";
import { getUserIdByClerkUserId } from "@/domains/user/service/user-settings.service.js";
import { isValidTimezone } from "@/utils/timezone.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:streak:route");

function getTimezone(req: Request): string {
  const fromHeader = req.headers["x-user-timezone"];
  const fromQuery = req.query.timezone;
  const tz = (typeof fromHeader === "string" ? fromHeader : typeof fromQuery === "string" ? fromQuery : "").trim();
  if (tz && isValidTimezone(tz)) {
    return tz;
  }
  return "UTC";
}

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

    return res.json(userStreak);
  } catch (error) {
    logger.error("Unexpected error in GET /user-streak/me: %o", error as Error);
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

    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in GET /user-streak/me/history: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user streak history",
    });
  }
});

router.get("/calendar", async (req: Request, res: Response) => {
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

    const year = req.query.year ? parseInt(String(req.query.year), 10) : null;
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;

    if (year === null || isNaN(year)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Year query parameter is required and must be a number",
      });
    }

    if (month === null || isNaN(month)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Month query parameter is required and must be a number",
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Month must be between 1 and 12",
      });
    }

    const timezone = getTimezone(req);
    const calendarData = await getUserStreakCalendar(userId, year, month, timezone);

    return res.json(calendarData);
  } catch (error) {
    logger.error("Unexpected error in GET /user-streak/calendar: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user streak calendar",
    });
  }
});

export default router;
