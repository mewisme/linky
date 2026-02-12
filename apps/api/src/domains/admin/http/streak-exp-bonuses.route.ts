import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import type { AdminStreakExpBonusInsert, AdminStreakExpBonusUpdate } from "@/domains/admin/types/streak-exp-bonus.types.js";
import {
  createAdminStreakExpBonus,
  deleteAdminStreakExpBonus,
  getStreakExpBonus,
  listStreakExpBonuses,
  updateAdminStreakExpBonus,
} from "@/domains/admin/service/admin-streak-exp-bonuses.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:streak-exp-bonuses:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const bonuses = await listStreakExpBonuses();

    return res.json({
      data: bonuses,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/streak-exp-bonuses: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch streak EXP bonuses",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid bonus ID",
      });
    }

    const bonus = await getStreakExpBonus(id);

    if (!bonus) {
      return res.status(404).json({
        error: "Not Found",
        message: "Streak EXP bonus not found",
      });
    }

    return res.json(bonus);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/streak-exp-bonuses/:id: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch streak EXP bonus",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const bonusData: AdminStreakExpBonusInsert = req.body;

    if (!bonusData.min_streak || typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "min_streak is required and must be a non-negative number",
      });
    }

    if (!bonusData.max_streak || typeof bonusData.max_streak !== "number" || bonusData.max_streak < bonusData.min_streak) {
      return res.status(400).json({
        error: "Bad Request",
        message: "max_streak is required and must be greater than or equal to min_streak",
      });
    }

    if (
      !bonusData.bonus_multiplier ||
      typeof bonusData.bonus_multiplier !== "number" ||
      bonusData.bonus_multiplier < 1.0
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: "bonus_multiplier is required and must be at least 1.0",
      });
    }

    const created = await createAdminStreakExpBonus(bonusData);

    return res.status(201).json(created);
  } catch (error) {
    logger.error("Unexpected error in POST /admin/streak-exp-bonuses: %o", error as Error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create streak EXP bonus",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid bonus ID",
      });
    }

    const bonusData: AdminStreakExpBonusUpdate = req.body;

    if (bonusData.min_streak !== undefined) {
      if (typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "min_streak must be a non-negative number",
        });
      }
    }

    if (bonusData.max_streak !== undefined) {
      if (typeof bonusData.max_streak !== "number") {
        return res.status(400).json({
          error: "Bad Request",
          message: "max_streak must be a number",
        });
      }

      const minStreak = bonusData.min_streak !== undefined ? bonusData.min_streak : 0;
      if (bonusData.max_streak < minStreak) {
        return res.status(400).json({
          error: "Bad Request",
          message: "max_streak must be greater than or equal to min_streak",
        });
      }
    }

    if (bonusData.bonus_multiplier !== undefined) {
      if (typeof bonusData.bonus_multiplier !== "number" || bonusData.bonus_multiplier < 1.0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "bonus_multiplier must be at least 1.0",
        });
      }
    }

    const updated = await updateAdminStreakExpBonus(id, bonusData);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PUT /admin/streak-exp-bonuses/:id: %o", error as Error);

    if (error instanceof Error && error.message === "Streak EXP bonus not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update streak EXP bonus",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid bonus ID",
      });
    }

    const bonusData: Partial<AdminStreakExpBonusUpdate> = req.body;

    if (bonusData.min_streak !== undefined) {
      if (typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "min_streak must be a non-negative number",
        });
      }
    }

    if (bonusData.max_streak !== undefined) {
      if (typeof bonusData.max_streak !== "number") {
        return res.status(400).json({
          error: "Bad Request",
          message: "max_streak must be a number",
        });
      }

      const minStreak = bonusData.min_streak !== undefined ? bonusData.min_streak : 0;
      if (bonusData.max_streak < minStreak) {
        return res.status(400).json({
          error: "Bad Request",
          message: "max_streak must be greater than or equal to min_streak",
        });
      }
    }

    if (bonusData.bonus_multiplier !== undefined) {
      if (typeof bonusData.bonus_multiplier !== "number" || bonusData.bonus_multiplier < 1.0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "bonus_multiplier must be at least 1.0",
        });
      }
    }

    const updated = await updateAdminStreakExpBonus(id, bonusData);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PATCH /admin/streak-exp-bonuses/:id: %o", error as Error);

    if (error instanceof Error && error.message === "Streak EXP bonus not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update streak EXP bonus",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid bonus ID",
      });
    }

    await deleteAdminStreakExpBonus(id);

    return res.json({
      message: "Streak EXP bonus deleted successfully",
    });
  } catch (error) {
    logger.error("Unexpected error in DELETE /admin/streak-exp-bonuses/:id: %o", error as Error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete streak EXP bonus",
    });
  }
});

export default router;
