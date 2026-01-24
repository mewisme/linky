import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger/api";
import { getSharedStreaksForUser } from "../../../infra/supabase/repositories/shared-streaks.js";
import { getUserIdByClerkUserId } from "../service/user-settings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:User:SharedStreaks:Route");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized", message: "User ID not found in authentication token" });
    }
    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({ error: "Not Found", message: "User not found in database" });
    }
    const rows = await getSharedStreaksForUser(userId);
    const data = rows.map((r) => ({
      partnerUserId: r.user_a === userId ? r.user_b : r.user_a,
      currentStreak: r.current_streak,
      longestStreak: r.longest_streak,
      lastValidDate: r.last_valid_date,
    }));
    logger.info("User shared streaks fetched for user: %s", userId);
    return res.json({ data });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /user-shared-streaks/me: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch shared streaks" });
  }
});

export default router;
