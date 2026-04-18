import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { AdminLevelRewardInsert, AdminLevelRewardUpdate } from "@/domains/admin/types/level-reward.types.js";
import {
  createAdminLevelReward,
  deleteAdminLevelReward,
  getLevelReward,
  listLevelRewards,
  updateAdminLevelReward,
} from "@/domains/admin/service/admin-level-rewards.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:level-rewards:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const rewards = await listLevelRewards();

    return res.json({
      data: rewards,
    });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/level-rewards");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_LEVEL_REWARDS", "failedFetchLevelRewards", "Failed to fetch level rewards"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_REWARD_ID", "invalidRewardId", "Invalid reward ID"));
    }

    const reward = await getLevelReward(id);

    if (!reward) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_REWARD_NOT_FOUND", "levelRewardNotFound", "Level reward not found"),
      );
    }

    return res.json(reward);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/level-rewards/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_LEVEL_REWARD", "failedFetchLevelReward", "Failed to fetch level reward"),
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const rewardData: AdminLevelRewardInsert = req.body;

    if (!rewardData.level_required || typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um(
          "LEVEL_REWARD_LEVEL_REQUIRED",
          "levelRewardLevelRequired",
          "level_required is required and must be a positive number",
        ),
      );
    }

    if (!rewardData.reward_type || typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um(
          "LEVEL_REWARD_TYPE_REQUIRED",
          "levelRewardTypeRequired",
          "reward_type is required and must be a non-empty string",
        ),
      );
    }

    if (rewardData.reward_type.length > 100) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("LEVEL_REWARD_TYPE_LENGTH", "levelRewardTypeLength", "reward_type must be 100 characters or less"),
      );
    }

    if (!rewardData.reward_payload || typeof rewardData.reward_payload !== "object") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("LEVEL_REWARD_PAYLOAD_OBJECT", "levelRewardPayloadObject", "reward_payload is required and must be an object"),
      );
    }

    const created = await createAdminLevelReward(rewardData);

    return res.status(201).json(created);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/level-rewards");

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("LEVEL_REWARD_DUPLICATE", "levelRewardDuplicate", "A level reward with this level and type already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_CREATE_LEVEL_REWARD", "failedCreateLevelReward", "Failed to create level reward"),
    );
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_REWARD_ID", "invalidRewardId", "Invalid reward ID"));
    }

    const rewardData: AdminLevelRewardUpdate = req.body;

    if (rewardData.level_required !== undefined) {
      if (typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_LEVEL_POSITIVE", "level_required must be a positive number"),
        );
      }
    }

    if (rewardData.reward_type !== undefined) {
      if (typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_TYPE_NONEMPTY", "reward_type must be a non-empty string"),
        );
      }

      if (rewardData.reward_type.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("LEVEL_REWARD_TYPE_LENGTH", "levelRewardTypeLength", "reward_type must be 100 characters or less"),
        );
      }
    }

    if (rewardData.reward_payload !== undefined) {
      if (typeof rewardData.reward_payload !== "object") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_PAYLOAD_MUST_OBJECT", "reward_payload must be an object"),
        );
      }
    }

    const updated = await updateAdminLevelReward(id, rewardData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /admin/level-rewards/:id");

    if (error instanceof Error && error.message === "Level reward not found") {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_REWARD_NOT_FOUND", "levelRewardNotFound", "Level reward not found"),
      );
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("LEVEL_REWARD_DUPLICATE", "levelRewardDuplicate", "A level reward with this level and type already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_LEVEL_REWARD", "failedUpdateLevelReward", "Failed to update level reward"),
    );
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_REWARD_ID", "invalidRewardId", "Invalid reward ID"));
    }

    const rewardData: Partial<AdminLevelRewardUpdate> = req.body;

    if (rewardData.level_required !== undefined) {
      if (typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_LEVEL_POSITIVE", "level_required must be a positive number"),
        );
      }
    }

    if (rewardData.reward_type !== undefined) {
      if (typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_TYPE_NONEMPTY", "reward_type must be a non-empty string"),
        );
      }

      if (rewardData.reward_type.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("LEVEL_REWARD_TYPE_LENGTH", "levelRewardTypeLength", "reward_type must be 100 characters or less"),
        );
      }
    }

    if (rewardData.reward_payload !== undefined) {
      if (typeof rewardData.reward_payload !== "object") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("LEVEL_REWARD_PAYLOAD_MUST_OBJECT", "reward_payload must be an object"),
        );
      }
    }

    const updated = await updateAdminLevelReward(id, rewardData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /admin/level-rewards/:id");

    if (error instanceof Error && error.message === "Level reward not found") {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_REWARD_NOT_FOUND", "levelRewardNotFound", "Level reward not found"),
      );
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("LEVEL_REWARD_DUPLICATE", "levelRewardDuplicate", "A level reward with this level and type already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_LEVEL_REWARD", "failedUpdateLevelReward", "Failed to update level reward"),
    );
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_REWARD_ID", "invalidRewardId", "Invalid reward ID"));
    }

    await deleteAdminLevelReward(id);

    return sendJsonWithUserMessage(
      res,
      200,
      {},
      um("LEVEL_REWARD_DELETED_SUCCESS", "levelRewardDeletedSuccess", "Level reward deleted successfully"),
    );
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/level-rewards/:id");

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_DELETE_LEVEL_REWARD", "failedDeleteLevelReward", "Failed to delete level reward"),
    );
  }
});

export default router;
