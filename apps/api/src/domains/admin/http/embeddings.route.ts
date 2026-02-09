import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
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
      return res.status(400).json({
        error: "Bad Request",
        message: "user_id_a and user_id_b are required",
      });
    }

    const result = await compareUsers(String(userIdA).trim(), String(userIdB).trim());

    if (!result.ok) {
      return res.status(404).json({
        error: "Not Found",
        message: result.error,
      });
    }

    return res.json({
      similarity_score: result.similarity_score,
      model_name: result.model_name,
      user_a_updated_at: result.user_a_updated_at,
      user_b_updated_at: result.user_b_updated_at,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/embeddings/compare: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to compare embeddings",
    });
  }
});

router.post("/similar", async (req: Request, res: Response) => {
  try {
    const { user_id: userId, limit: rawLimit, threshold: rawThreshold } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "user_id is required",
      });
    }

    const limit = typeof rawLimit === "number" ? rawLimit : 10;
    const threshold = typeof rawThreshold === "number" ? rawThreshold : undefined;
    const result = await findSimilarUsers(String(userId).trim(), { limit, threshold });

    if (!result.ok) {
      return res.status(404).json({
        error: "Not Found",
        message: result.error,
      });
    }

    return res.json({
      base_user_id: result.base_user_id,
      results: result.results,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/embeddings/similar: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to find similar users",
    });
  }
});

router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { user_ids: rawUserIds } = req.body;

    if (!rawUserIds) {
      return res.status(400).json({
        error: "Bad Request",
        message: "user_ids is required",
      });
    }

    const { valid, invalid } = validateUserIds(rawUserIds);

    if (valid.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "user_ids must be a non-empty array of valid UUIDs",
        invalid,
      });
    }

    if (invalid.length > 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid user_id format",
        invalid,
      });
    }

    const result = await syncEmbeddingsForUsers(valid);

    return res.json({
      accepted_user_ids: result.accepted_user_ids,
      skipped_user_ids: result.skipped_user_ids,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/embeddings/sync: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to sync embeddings",
    });
  }
});

router.post("/sync-all", async (req: Request, res: Response) => {
  try {
    scheduleSyncAllEmbeddings();
    return res.json({ message: "Embedding sync job accepted" });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/embeddings/sync-all: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to schedule embedding sync",
    });
  }
});

export default router;
