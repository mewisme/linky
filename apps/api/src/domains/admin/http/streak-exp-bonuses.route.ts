import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/streak-exp-bonuses");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_LIST_FAIL", "Failed to fetch streak EXP bonuses"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", umDetail("STREAK_EXP_INVALID_ID", "Invalid bonus ID"));
    }

    const bonus = await getStreakExpBonus(id);

    if (!bonus) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        umDetail("STREAK_EXP_NOT_FOUND", "Streak EXP bonus not found"),
      );
    }

    return res.json(bonus);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/streak-exp-bonuses/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_GET_FAIL", "Failed to fetch streak EXP bonus"),
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const bonusData: AdminStreakExpBonusInsert = req.body;

    if (!bonusData.min_streak || typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail("STREAK_EXP_MIN", "min_streak is required and must be a non-negative number"),
      );
    }

    if (!bonusData.max_streak || typeof bonusData.max_streak !== "number" || bonusData.max_streak < bonusData.min_streak) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail("STREAK_EXP_MAX", "max_streak is required and must be greater than or equal to min_streak"),
      );
    }

    if (
      !bonusData.bonus_multiplier ||
      typeof bonusData.bonus_multiplier !== "number" ||
      bonusData.bonus_multiplier < 1.0
    ) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail("STREAK_EXP_MULT", "bonus_multiplier is required and must be at least 1.0"),
      );
    }

    const created = await createAdminStreakExpBonus(bonusData);

    return res.status(201).json(created);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/streak-exp-bonuses");

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_CREATE_FAIL", "Failed to create streak EXP bonus"),
    );
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", umDetail("STREAK_EXP_INVALID_ID_PUT", "Invalid bonus ID"));
    }

    const bonusData: AdminStreakExpBonusUpdate = req.body;

    if (bonusData.min_streak !== undefined) {
      if (typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MIN_PUT", "min_streak must be a non-negative number"),
        );
      }
    }

    if (bonusData.max_streak !== undefined) {
      if (typeof bonusData.max_streak !== "number") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MAX_TYPE", "max_streak must be a number"),
        );
      }

      const minStreak = bonusData.min_streak !== undefined ? bonusData.min_streak : 0;
      if (bonusData.max_streak < minStreak) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MAX_GTE", "max_streak must be greater than or equal to min_streak"),
        );
      }
    }

    if (bonusData.bonus_multiplier !== undefined) {
      if (typeof bonusData.bonus_multiplier !== "number" || bonusData.bonus_multiplier < 1.0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MULT_PUT", "bonus_multiplier must be at least 1.0"),
        );
      }
    }

    const updated = await updateAdminStreakExpBonus(id, bonusData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /admin/streak-exp-bonuses/:id");

    if (error instanceof Error && error.message === "Streak EXP bonus not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("STREAK_EXP_NOT_FOUND_PUT", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_UPDATE_FAIL", "Failed to update streak EXP bonus"),
    );
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", umDetail("STREAK_EXP_INVALID_ID_PATCH", "Invalid bonus ID"));
    }

    const bonusData: Partial<AdminStreakExpBonusUpdate> = req.body;

    if (bonusData.min_streak !== undefined) {
      if (typeof bonusData.min_streak !== "number" || bonusData.min_streak < 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MIN_PATCH", "min_streak must be a non-negative number"),
        );
      }
    }

    if (bonusData.max_streak !== undefined) {
      if (typeof bonusData.max_streak !== "number") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MAX_TYPE_PATCH", "max_streak must be a number"),
        );
      }

      const minStreak = bonusData.min_streak !== undefined ? bonusData.min_streak : 0;
      if (bonusData.max_streak < minStreak) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MAX_GTE_PATCH", "max_streak must be greater than or equal to min_streak"),
        );
      }
    }

    if (bonusData.bonus_multiplier !== undefined) {
      if (typeof bonusData.bonus_multiplier !== "number" || bonusData.bonus_multiplier < 1.0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("STREAK_EXP_MULT_PATCH", "bonus_multiplier must be at least 1.0"),
        );
      }
    }

    const updated = await updateAdminStreakExpBonus(id, bonusData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /admin/streak-exp-bonuses/:id");

    if (error instanceof Error && error.message === "Streak EXP bonus not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("STREAK_EXP_NOT_FOUND_PATCH", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_UPDATE_FAIL_PATCH", "Failed to update streak EXP bonus"),
    );
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", umDetail("STREAK_EXP_INVALID_ID_DEL", "Invalid bonus ID"));
    }

    await deleteAdminStreakExpBonus(id);

    return sendJsonWithUserMessage(
      res,
      200,
      {},
      umDetail("STREAK_EXP_DELETED", "Streak EXP bonus deleted successfully"),
    );
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/streak-exp-bonuses/:id");

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("STREAK_EXP_DELETE_FAIL", "Failed to delete streak EXP bonus"),
    );
  }
});

export default router;
