import { simulateEconomy } from "@/domains/admin/service/admin-economy-simulate.service.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:economy-simulate:route");

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const days = typeof body.days === "number" ? body.days : Number(body.days);
    const avgExpPerUser =
      typeof body.avg_exp_per_user === "number"
        ? body.avg_exp_per_user
        : Number(body.avg_exp_per_user);
    const userCount =
      typeof body.user_count === "number" ? body.user_count : Number(body.user_count);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return res.status(400).json({
        error: "Bad Request",
        message: "days must be an integer between 1 and 365",
      });
    }
    if (!Number.isFinite(avgExpPerUser) || avgExpPerUser < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "avg_exp_per_user must be a non-negative number",
      });
    }
    if (!Number.isInteger(userCount) || userCount < 1 || userCount > 10_000_000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "user_count must be an integer between 1 and 10000000",
      });
    }

    const result = await simulateEconomy({
      days,
      avgExpPerUser,
      userCount,
    });
    return res.json(result);
  } catch (error) {
    logger.error("Unexpected error in POST /admin/economy/simulate: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to run economy simulation",
    });
  }
});

export default router;
