import { ConversionError, convertExpToCoin } from "@/domains/economy/service/conversion.service.js";
import type { ConvertExpBody } from "@/domains/economy/types/economy.types.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy:route");

router.post("/convert", async (req: Request, res: Response) => {
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

    const body = req.body as ConvertExpBody;
    const expAmount = typeof body?.expAmount === "number" ? body.expAmount : undefined;
    if (expAmount === undefined || !Number.isInteger(expAmount)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "expAmount must be an integer",
      });
    }

    const result = await convertExpToCoin(userId, expAmount);
    return res.json({
      expSpent: result.expSpent,
      baseCoins: result.baseCoins,
      bonusCoins: result.bonusCoins,
      totalCoins: result.totalCoins,
      newCoinBalance: result.newCoinBalance,
    });
  } catch (err) {
    if (err instanceof ConversionError) {
      if (err.code === "INVALID_AMOUNT") {
        return res.status(400).json({ error: "Bad Request", message: err.message });
      }
      if (err.code === "INSUFFICIENT_EXP") {
        return res.status(422).json({ error: "Unprocessable Entity", message: err.message });
      }
    }
    logger.error("Unexpected error in POST /economy/convert: %o", err as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to convert EXP to coins",
    });
  }
});

export default router;
