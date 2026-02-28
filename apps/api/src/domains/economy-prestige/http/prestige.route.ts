import { prestigeUser } from "@/domains/economy-prestige/prestige.service.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@/utils/logger.js";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-prestige:route");

router.post("/", async (req: Request, res: Response) => {
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

    const result = await prestigeUser(userId);
    return res.status(200).json({
      vaultBonus: result.vaultBonus,
      totalPrestiges: result.totalPrestiges,
      prestigeRank: result.prestigeRank,
      prestigeTier: result.prestigeTier,
    });
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === "PRESTIGE_THRESHOLD_NOT_MET") {
      return res.status(422).json({
        error: "Unprocessable Entity",
        message: "Prestige threshold not met (minimum level or total EXP required)",
      });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }
    logger.error(err as Error, "Unexpected error in POST /users/prestige");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to prestige",
    });
  }
});

export default router;
