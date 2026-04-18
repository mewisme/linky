import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/level-feature-unlocks");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_LEVEL_FEATURE_UNLOCKS", "failedFetchLevelFeatureUnlocks", "Failed to fetch level feature unlocks"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_UNLOCK_ID", "invalidUnlockId", "Invalid unlock ID"));
    }

    const unlock = await getLevelFeatureUnlock(id);

    if (!unlock) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_FEATURE_UNLOCK_NOT_FOUND", "levelFeatureUnlockNotFound", "Level feature unlock not found"),
      );
    }

    return res.json(unlock);
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/level-feature-unlocks/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_LEVEL_FEATURE_UNLOCK", "failedFetchLevelFeatureUnlock", "Failed to fetch level feature unlock"),
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const unlockData: AdminLevelFeatureUnlockInsert = req.body;

    if (!unlockData.level_required || typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um(
          "FEATURE_UNLOCK_LEVEL_REQUIRED",
          "featureUnlockLevelRequired",
          "level_required is required and must be a positive number",
        ),
      );
    }

    if (!unlockData.feature_key || typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um(
          "FEATURE_UNLOCK_KEY_REQUIRED",
          "featureUnlockKeyRequired",
          "feature_key is required and must be a non-empty string",
        ),
      );
    }

    if (unlockData.feature_key.length > 100) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("FEATURE_UNLOCK_KEY_LENGTH", "featureUnlockKeyLength", "feature_key must be 100 characters or less"),
      );
    }

    if (!unlockData.feature_payload || typeof unlockData.feature_payload !== "object") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um(
          "FEATURE_UNLOCK_PAYLOAD_OBJECT",
          "featureUnlockPayloadObject",
          "feature_payload is required and must be an object",
        ),
      );
    }

    const created = await createAdminLevelFeatureUnlock(unlockData);

    return res.status(201).json(created);
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/level-feature-unlocks");

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um(
          "FEATURE_UNLOCK_DUPLICATE",
          "featureUnlockDuplicate",
          "A level feature unlock with this level and feature_key already exists",
        ),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_CREATE_FEATURE_UNLOCK", "failedCreateFeatureUnlock", "Failed to create level feature unlock"),
    );
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_UNLOCK_ID", "invalidUnlockId", "Invalid unlock ID"));
    }

    const unlockData: AdminLevelFeatureUnlockUpdate = req.body;

    if (unlockData.level_required !== undefined) {
      if (typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_LEVEL_POSITIVE", "level_required must be a positive number"),
        );
      }
    }

    if (unlockData.feature_key !== undefined) {
      if (typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_KEY_NONEMPTY", "feature_key must be a non-empty string"),
        );
      }

      if (unlockData.feature_key.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("FEATURE_UNLOCK_KEY_LENGTH", "featureUnlockKeyLength", "feature_key must be 100 characters or less"),
        );
      }
    }

    if (unlockData.feature_payload !== undefined) {
      if (typeof unlockData.feature_payload !== "object") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_PAYLOAD_MUST_OBJECT", "feature_payload must be an object"),
        );
      }
    }

    const updated = await updateAdminLevelFeatureUnlock(id, unlockData);

    return res.json(updated);
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /admin/level-feature-unlocks/:id");

    if (error instanceof Error && error.message === "Level feature unlock not found") {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_FEATURE_UNLOCK_NOT_FOUND", "levelFeatureUnlockNotFound", "Level feature unlock not found"),
      );
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um(
          "FEATURE_UNLOCK_DUPLICATE",
          "featureUnlockDuplicate",
          "A level feature unlock with this level and feature_key already exists",
        ),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_FEATURE_UNLOCK", "failedUpdateFeatureUnlock", "Failed to update level feature unlock"),
    );
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_UNLOCK_ID", "invalidUnlockId", "Invalid unlock ID"));
    }

    const unlockData: Partial<AdminLevelFeatureUnlockUpdate> = req.body;

    if (unlockData.level_required !== undefined) {
      if (typeof unlockData.level_required !== "number" || unlockData.level_required <= 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_LEVEL_POSITIVE", "level_required must be a positive number"),
        );
      }
    }

    if (unlockData.feature_key !== undefined) {
      if (typeof unlockData.feature_key !== "string" || unlockData.feature_key.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_KEY_NONEMPTY", "feature_key must be a non-empty string"),
        );
      }

      if (unlockData.feature_key.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("FEATURE_UNLOCK_KEY_LENGTH", "featureUnlockKeyLength", "feature_key must be 100 characters or less"),
        );
      }
    }

    if (unlockData.feature_payload !== undefined) {
      if (typeof unlockData.feature_payload !== "object") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("FEATURE_UNLOCK_PAYLOAD_MUST_OBJECT", "feature_payload must be an object"),
        );
      }
    }

    const updated = await updateAdminLevelFeatureUnlock(id, unlockData);

    return res.json(updated);
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /admin/level-feature-unlocks/:id");

    if (error instanceof Error && error.message === "Level feature unlock not found") {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("LEVEL_FEATURE_UNLOCK_NOT_FOUND", "levelFeatureUnlockNotFound", "Level feature unlock not found"),
      );
    }

    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um(
          "FEATURE_UNLOCK_DUPLICATE",
          "featureUnlockDuplicate",
          "A level feature unlock with this level and feature_key already exists",
        ),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_FEATURE_UNLOCK", "failedUpdateFeatureUnlock", "Failed to update level feature unlock"),
    );
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_UNLOCK_ID", "invalidUnlockId", "Invalid unlock ID"));
    }

    await deleteAdminLevelFeatureUnlock(id);

    return sendJsonWithUserMessage(
      res,
      200,
      {},
      um("FEATURE_UNLOCK_DELETED_SUCCESS", "featureUnlockDeletedSuccess", "Level feature unlock deleted successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/level-feature-unlocks/:id");

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_DELETE_FEATURE_UNLOCK", "failedDeleteFeatureUnlock", "Failed to delete level feature unlock"),
    );
  }
});

export default router;
