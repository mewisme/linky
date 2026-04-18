import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";
import {
  syncEmbeddingsForUsers,
  scheduleSyncAllEmbeddings,
  validateUserIds,
  compareUsers,
  findSimilarUsers,
} from "@/domains/admin/service/admin-embeddings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:embeddings:route");

router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { user_id_a: userIdA, user_id_b: userIdB } = req.body;

    if (!userIdA || !userIdB) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("EMB_USER_PAIR_REQUIRED", "userIdPairRequired", "user_id_a and user_id_b are required"),
      );
    }

    const result = await compareUsers(String(userIdA).trim(), String(userIdB).trim());

    if (!result.ok) {
      return sendJsonError(res, 404, "Not Found", umDetail("EMB_COMPARE_NOT_FOUND", result.error));
    }

    return res.json({
      similarity_score: result.similarity_score,
      model_name: result.model_name,
      user_a_updated_at: result.user_a_updated_at,
      user_b_updated_at: result.user_b_updated_at,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/embeddings/compare");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_COMPARE_EMB", "failedCompareEmbeddings", "Failed to compare embeddings"),
    );
  }
});

router.post("/similar", async (req: Request, res: Response) => {
  try {
    const { user_id: userId, limit: rawLimit, threshold: rawThreshold } = req.body;

    if (!userId) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("EMB_USER_ID_REQUIRED", "userIdRequired", "user_id is required"),
      );
    }

    const limit = typeof rawLimit === "number" ? rawLimit : 10;
    const threshold = typeof rawThreshold === "number" ? rawThreshold : undefined;
    const result = await findSimilarUsers(String(userId).trim(), { limit, threshold });

    if (!result.ok) {
      return sendJsonError(res, 404, "Not Found", umDetail("EMB_SIMILAR_NOT_FOUND", result.error));
    }

    return res.json({
      base_user_id: result.base_user_id,
      results: result.results,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/embeddings/similar");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FIND_SIMILAR", "failedFindSimilar", "Failed to find similar users"),
    );
  }
});

router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { user_ids: rawUserIds } = req.body;

    if (!rawUserIds) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("EMB_USER_IDS_REQUIRED", "userIdsRequired", "user_ids is required"),
      );
    }

    const { valid, invalid } = validateUserIds(rawUserIds);

    if (valid.length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("EMB_USER_IDS_INVALID", "userIdsNonEmptyUuids", "user_ids must be a non-empty array of valid UUIDs"),
        { invalid },
      );
    }

    if (invalid.length > 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("EMB_INVALID_USER_ID", "invalidUserIdFormat", "Invalid user_id format"),
        { invalid },
      );
    }

    const result = await syncEmbeddingsForUsers(valid);

    return res.json({
      accepted_user_ids: result.accepted_user_ids,
      skipped_user_ids: result.skipped_user_ids,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/embeddings/sync");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_SYNC_EMB", "failedSyncEmbeddings", "Failed to sync embeddings"),
    );
  }
});

router.post("/sync-all", async (req: Request, res: Response) => {
  try {
    scheduleSyncAllEmbeddings();
    return res.json({
      ...userFacingPayload(
        toUserMessage("EMB_SYNC_ALL", { key: "api.embeddingSyncAccepted" }, "Embedding sync job accepted"),
      ),
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/embeddings/sync-all");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_SCHEDULE_EMB", "failedScheduleEmbeddingSync", "Failed to schedule embedding sync"),
    );
  }
});

export default router;
