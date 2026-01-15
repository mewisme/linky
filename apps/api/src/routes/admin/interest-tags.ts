import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import type { TablesInsert, TablesUpdate } from "../../types/database.types.js";
import {
  getInterestTags,
  getInterestTagById,
  createInterestTag,
  updateInterestTag,
  deleteInterestTag,
  deleteInterestTagHard,
} from "../../lib/supabase/queries/interest-tags.js";

const router: ExpressRouter = Router();
const logger = new Logger("AdminInterestTagsRoute");

type InterestTagInsert = TablesInsert<"interest_tags">;
type InterestTagUpdate = TablesUpdate<"interest_tags">;

router.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    let isActive: boolean | undefined;
    if (req.query.isActive !== undefined) {
      const isActiveParam = req.query.isActive as string;
      if (isActiveParam === "all") {
        isActive = undefined;
      } else {
        isActive = isActiveParam === "true" || isActiveParam === "1";
      }
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, count } = await getInterestTags({
      category,
      isActive,
      search,
      limit,
      offset,
    });

    logger.info("Admin fetched interest tags:", { count, limit, offset });

    return res.json({
      data,
      pagination: {
        limit,
        offset,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/interest-tags:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch interest tags",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid tag ID",
      });
    }

    const tag = await getInterestTagById(id);

    if (!tag) {
      return res.status(404).json({
        error: "Not Found",
        message: "Interest tag not found",
      });
    }

    logger.info("Admin fetched interest tag:", id);

    return res.json(tag);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/interest-tags/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch interest tag",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const tagData: InterestTagInsert = req.body;

    if (!tagData.name || typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Tag name is required and must be a non-empty string",
      });
    }

    if (tagData.name.length > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Tag name must be 100 characters or less",
      });
    }

    const created = await createInterestTag(tagData);

    logger.info("Admin created interest tag:", created.id);

    return res.status(201).json(created);
  } catch (error) {
    logger.error("Unexpected error in POST /admin/interest-tags:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message.includes("duplicate") || error instanceof Error && error.message.includes("unique")) {
      return res.status(409).json({
        error: "Conflict",
        message: "An interest tag with this name already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create interest tag",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid tag ID",
      });
    }

    const tagData: InterestTagUpdate = req.body;

    if (tagData.name !== undefined) {
      if (typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Tag name must be a non-empty string",
        });
      }

      if (tagData.name.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Tag name must be 100 characters or less",
        });
      }
    }

    const updated = await updateInterestTag(id, tagData);

    logger.info("Admin updated interest tag:", id);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PUT /admin/interest-tags/:id:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes("duplicate") || error instanceof Error && error.message.includes("unique")) {
      return res.status(409).json({
        error: "Conflict",
        message: "An interest tag with this name already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update interest tag",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid tag ID",
      });
    }

    const tagData: Partial<InterestTagUpdate> = req.body;

    if (tagData.name !== undefined) {
      if (typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Tag name must be a non-empty string",
        });
      }

      if (tagData.name.length > 100) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Tag name must be 100 characters or less",
        });
      }
    }

    const updated = await updateInterestTag(id, tagData);

    logger.info("Admin patched interest tag:", id);

    return res.json(updated);
  } catch (error) {
    logger.error("Unexpected error in PATCH /admin/interest-tags/:id:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes("duplicate") || error instanceof Error && error.message.includes("unique")) {
      return res.status(409).json({
        error: "Conflict",
        message: "An interest tag with this name already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update interest tag",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid tag ID",
      });
    }

    const deleted = await deleteInterestTag(id);

    logger.info("Admin soft deleted interest tag:", id);

    return res.json({
      message: "Interest tag deactivated successfully",
      data: deleted,
    });
  } catch (error) {
    logger.error("Unexpected error in DELETE /admin/interest-tags/:id:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete interest tag",
    });
  }
});

router.delete("/:id/hard", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid tag ID",
      });
    }

    await deleteInterestTagHard(id);

    logger.info("Admin hard deleted interest tag:", id);

    return res.json({
      message: "Interest tag permanently deleted",
    });
  } catch (error) {
    logger.error("Unexpected error in DELETE /admin/interest-tags/:id/hard:", error instanceof Error ? error.message : "Unknown error");

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to hard delete interest tag",
    });
  }
});

export default router;
