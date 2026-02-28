import { getDailyProgress } from "@/domains/economy-daily/service/daily-exp.service.js";
import { getTimezoneForUser } from "@/domains/user/service/user-details.service.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@/utils/logger.js";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { toUserLocalDateString } from "@/utils/timezone.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-daily:route");

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
    const progress = await getDailyProgress(userId, localDate);
    return res.json(progress);
  } catch (error) {
    logger.error(error as Error, "Unexpected error in GET /economy/daily/progress");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch daily progress",
    });
  }
});

export default router;
