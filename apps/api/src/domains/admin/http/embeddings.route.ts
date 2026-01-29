import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import {
  syncEmbeddingsForUsers,
  scheduleSyncAllEmbeddings,
  validateUserIds,
} from "../service/admin-embeddings.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:Admin:Embeddings:Route");

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
