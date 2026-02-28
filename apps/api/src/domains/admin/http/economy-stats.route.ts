import { getEconomyStats } from "@/domains/admin/service/admin-economy-stats.service.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:economy-stats:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const stats = await getEconomyStats();
    return res.json(stats);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/economy/stats: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch economy stats",
    });
  }
});

export default router;
