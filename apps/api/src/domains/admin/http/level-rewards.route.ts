import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import type { AdminLevelRewardInsert, AdminLevelRewardUpdate } from "../types/level-reward.types.js";
import {
  createAdminLevelReward,
  deleteAdminLevelReward,
  getLevelReward,
  listLevelRewards,
  updateAdminLevelReward,
} from "../service/admin-level-rewards.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:Admin:LevelRewards:Route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const rewards = await listLevelRewards();

    logger.info("Admin fetched level rewards: %d", rewards.length);

    return res.json({
      data: rewards,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/level-rewards: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch level rewards",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid reward ID",
      });
    }

    const reward = await getLevelReward(id);

    if (!reward) {
      return res.status(404).json({
        error: "Not Found",
        message: "Level reward not found",
      });
    }

    logger.info("Admin fetched level reward: %s", id);

    return res.json(reward);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/level-rewards/:id: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch level reward",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const rewardData: AdminLevelRewardInsert = req.body;

    if (!rewardData.level_required || typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "level_required is required and must be a positive number",
      });
    }

    if (!rewardData.reward_type || typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "reward_type is required and must be a non-empty string",
      });
    }

    if (rewardData.reward_type.length > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "reward_type must be 100 characters or less",
      });
    }

    if (!rewardData.reward_payload || typeof rewardData.reward_payload !== "object") {
      return res.status(400).json({
        error: "Bad Request",
        message: "reward_payload is required and must be an object",
      });
    }

    const created = await createAdminLevelReward(rewardData);

    logger.info("Admin created level reward: %s", created.id);

    return res.status(201).json(created);
  } catch (error) {
    logger.error("Unexpected error in POST /admin/level-rewards: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level reward with this level and type already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create level reward",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid reward ID",
      });
    }

    const rewardData: AdminLevelRewardUpdate = req.body;

    if (rewardData.level_required !== undefined) {
      if (typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "level_required must be a positive number",
        });
      }
    }

    if (rewardData.reward_type !== undefined) {
      if (typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_type must be a non-empty string",
        });
      }

      if (rewardData.reward_type.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_type must be 100 characters or less",
        });
      }
    }

    if (rewardData.reward_payload !== undefined) {
      if (typeof rewardData.reward_payload !== "object") {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_payload must be an object",
        });
      }
    }

    const updated = await updateAdminLevelReward(id, rewardData);

    logger.info("Admin updated level reward: %s", id);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PUT /admin/level-rewards/:id: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message === "Level reward not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level reward with this level and type already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update level reward",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid reward ID",
      });
    }

    const rewardData: Partial<AdminLevelRewardUpdate> = req.body;

    if (rewardData.level_required !== undefined) {
      if (typeof rewardData.level_required !== "number" || rewardData.level_required <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "level_required must be a positive number",
        });
      }
    }

    if (rewardData.reward_type !== undefined) {
      if (typeof rewardData.reward_type !== "string" || rewardData.reward_type.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_type must be a non-empty string",
        });
      }

      if (rewardData.reward_type.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_type must be 100 characters or less",
        });
      }
    }

    if (rewardData.reward_payload !== undefined) {
      if (typeof rewardData.reward_payload !== "object") {
        return res.status(400).json({
          error: "Bad Request",
          message: "reward_payload must be an object",
        });
      }
    }

    const updated = await updateAdminLevelReward(id, rewardData);

    logger.info("Admin patched level reward: %s", id);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PATCH /admin/level-rewards/:id: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message === "Level reward not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level reward with this level and type already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update level reward",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid reward ID",
      });
    }

    await deleteAdminLevelReward(id);

    logger.info("Admin deleted level reward: %s", id);

    return res.json({
      message: "Level reward deleted successfully",
    });
  } catch (error) {
    logger.error("Unexpected error in DELETE /admin/level-rewards/:id: %o", error instanceof Error ? error : new Error(String(error)));

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete level reward",
    });
  }
});

export default router;
