import {
  claimMonthlyBuyback,
  claimMonthlyCheckin,
  getMonthlyProgress,
  MonthlyCheckinError,
} from "@/domains/economy-monthly/service/monthly-checkin.service.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { toUserLocalDateString } from "@/utils/timezone.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-monthly:route");

function getLocalDateParts(timezone: string): { year: number; month: number; day: number } {
  const s = toUserLocalDateString(new Date(), timezone);
  const parts = s.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return { year, month, day };
}

router.get("/progress", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserInternalId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const timezone = await getTimezoneForUser(userId);
    const { year, month, day: todayDay } = getLocalDateParts(timezone);
    const progress = await getMonthlyProgress(userId, year, month, todayDay);
    return res.json(progress);
  } catch (error) {
    logger.error("Unexpected error in GET /economy/monthly/progress: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch monthly progress",
    });
  }
});

router.post("/checkin", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserInternalId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const body = req.body as { day?: number };
    const day = typeof body?.day === "number" ? body.day : undefined;
    if (day === undefined || !Number.isInteger(day)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "day must be an integer",
      });
    }

    const result = await claimMonthlyCheckin(userId, day);
    return res.json(result);
  } catch (err) {
    if (err instanceof MonthlyCheckinError) {
      if (err.code === "ALREADY_CLAIMED") return res.status(409).json({ error: "Conflict", message: err.message });
      if (err.code === "FUTURE_DAY" || err.code === "INVALID_DAY") return res.status(400).json({ error: "Bad Request", message: err.message });
    }
    logger.error("Unexpected error in POST /economy/monthly/checkin: %o", err as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to claim monthly check-in",
    });
  }
});

router.post("/buyback", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserInternalId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const body = req.body as { day?: number };
    const day = typeof body?.day === "number" ? body.day : undefined;
    if (day === undefined || !Number.isInteger(day)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "day must be an integer",
      });
    }

    const result = await claimMonthlyBuyback(userId, day);
    return res.json(result);
  } catch (err) {
    if (err instanceof MonthlyCheckinError) {
      if (err.code === "ALREADY_CLAIMED") return res.status(409).json({ error: "Conflict", message: err.message });
      if (err.code === "BUYBACK_FUTURE_OR_TODAY" || err.code === "INVALID_DAY") return res.status(400).json({ error: "Bad Request", message: err.message });
      if (err.code === "INSUFFICIENT_EXP") return res.status(422).json({ error: "Unprocessable Entity", message: err.message });
    }
    logger.error("Unexpected error in POST /economy/monthly/buyback: %o", err as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to claim monthly buyback",
    });
  }
});

export default router;

