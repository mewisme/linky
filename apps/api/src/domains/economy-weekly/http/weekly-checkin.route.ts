import {
  claimWeeklyCheckin,
  getWeeklyProgress,
  WeeklyCheckinError,
} from "@/domains/economy-weekly/service/weekly-checkin.service.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@/utils/logger.js";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { toUserLocalDateString } from "@/utils/timezone.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-weekly:route");

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
    const localDate = toUserLocalDateString(new Date(), timezone);
    const progress = await getWeeklyProgress(userId, localDate);
    return res.json(progress);
  } catch (error) {
    logger.error(error as Error, "Unexpected error in GET /economy/weekly/progress");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch weekly progress",
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

    const result = await claimWeeklyCheckin(userId);
    return res.json(result);
  } catch (err) {
    if (err instanceof WeeklyCheckinError && err.code === "ALREADY_CLAIMED") {
      return res.status(409).json({
        error: "Conflict",
        message: err.message,
      });
    }
    logger.error(err as Error, "Unexpected error in POST /economy/weekly/checkin");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to claim weekly check-in",
    });
  }
});

export default router;
