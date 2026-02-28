import { purchaseBoost, BoostError } from "@/domains/economy-boost/service/boost.service.js";
import type { PurchaseBoostBody } from "@/domains/economy-boost/types/boost.types.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-boost:route");

router.post("/purchase", async (req: Request, res: Response) => {
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

    const body = req.body as PurchaseBoostBody;
    const boostType = typeof body?.boostType === "string" ? body.boostType.trim() : undefined;
    if (!boostType) {
      return res.status(400).json({
        error: "Bad Request",
        message: "boostType is required",
      });
    }

    const result = await purchaseBoost(userId, boostType);
    return res.json(result);
  } catch (err) {
    if (err instanceof BoostError) {
      if (err.code === "INVALID_BOOST_TYPE") {
        return res.status(400).json({ error: "Bad Request", message: err.message });
      }
      if (err.code === "INSUFFICIENT_COINS") {
        return res.status(422).json({ error: "Unprocessable Entity", message: err.message });
      }
    }
    logger.error("Unexpected error in POST /economy/boost/purchase: %o", err as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to purchase boost",
    });
  }
});

export default router;
