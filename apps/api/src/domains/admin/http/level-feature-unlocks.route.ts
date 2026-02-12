import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import type {
  AdminLevelFeatureUnlockInsert,
  AdminLevelFeatureUnlockUpdate,
} from "@/domains/admin/types/level-feature-unlock.types.js";
import {
  createAdminLevelFeatureUnlock,
  deleteAdminLevelFeatureUnlock,
  getLevelFeatureUnlock,
  listLevelFeatureUnlocks,
  updateAdminLevelFeatureUnlock,
} from "@/domains/admin/service/admin-level-feature-unlocks.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:level-feature-unlocks:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const unlocks = await listLevelFeatureUnlocks();

    return res.json({
      data: unlocks,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /admin/level-feature-unlocks: %o",
      error as Error,
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch level feature unlocks",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid unlock ID",
      });
    }

    const unlock = await getLevelFeatureUnlock(id);

    if (!unlock) {
      return res.status(404).json({
        error: "Not Found",
        message: "Level feature unlock not found",
      });
    }

    return res.json(unlock);
  } catch (error) {
    logger.error(
      "Unexpected error in GET /admin/level-feature-unlocks/:id: %o",
      error as Error,
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch level feature unlock",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const unlockData: AdminLevelFeatureUnlockInsert = req.body;

    if (!unlockData.level_required || typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "level_required is required and must be a positive number",
      });
    }

    if (!unlockData.feature_key || typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "feature_key is required and must be a non-empty string",
      });
    }

    if (unlockData.feature_key.length > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "feature_key must be 100 characters or less",
      });
    }

    if (!unlockData.feature_payload || typeof unlockData.feature_payload !== "object") {
      return res.status(400).json({
        error: "Bad Request",
        message: "feature_payload is required and must be an object",
      });
    }

    const created = await createAdminLevelFeatureUnlock(unlockData);

    return res.status(201).json(created);
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/level-feature-unlocks: %o",
      error as Error,
    );

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level feature unlock with this level and feature_key already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create level feature unlock",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid unlock ID",
      });
    }

    const unlockData: AdminLevelFeatureUnlockUpdate = req.body;

    if (unlockData.level_required !== undefined) {
      if (typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "level_required must be a positive number",
        });
      }
    }

    if (unlockData.feature_key !== undefined) {
      if (typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_key must be a non-empty string",
        });
      }

      if (unlockData.feature_key.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_key must be 100 characters or less",
        });
      }
    }

    if (unlockData.feature_payload !== undefined) {
      if (typeof unlockData.feature_payload !== "object") {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_payload must be an object",
        });
      }
    }

    const updated = await updateAdminLevelFeatureUnlock(id, unlockData);

    return res.json(updated);
  } catch (error) {
    logger.error(
      "Unexpected error in PUT /admin/level-feature-unlocks/:id: %o",
      error as Error,
    );

    if (error instanceof Error && error.message === "Level feature unlock not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level feature unlock with this level and feature_key already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update level feature unlock",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid unlock ID",
      });
    }

    const unlockData: Partial<AdminLevelFeatureUnlockUpdate> = req.body;

    if (unlockData.level_required !== undefined) {
      if (typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "level_required must be a positive number",
        });
      }
    }

    if (unlockData.feature_key !== undefined) {
      if (typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_key must be a non-empty string",
        });
      }

      if (unlockData.feature_key.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_key must be 100 characters or less",
        });
      }
    }

    if (unlockData.feature_payload !== undefined) {
      if (typeof unlockData.feature_payload !== "object") {
        return res.status(400).json({
          error: "Bad Request",
          message: "feature_payload must be an object",
        });
      }
    }

    const updated = await updateAdminLevelFeatureUnlock(id, unlockData);

    return res.json(updated);
  } catch (error) {
    logger.error(
      "Unexpected error in PATCH /admin/level-feature-unlocks/:id: %o",
      error as Error,
    );

    if (error instanceof Error && error.message === "Level feature unlock not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return res.status(409).json({
        error: "Conflict",
        message: "A level feature unlock with this level and feature_key already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update level feature unlock",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid unlock ID",
      });
    }

    await deleteAdminLevelFeatureUnlock(id);

    return res.json({
      message: "Level feature unlock deleted successfully",
    });
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /admin/level-feature-unlocks/:id: %o",
      error as Error,
    );

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete level feature unlock",
    });
  }
});

export default router;
