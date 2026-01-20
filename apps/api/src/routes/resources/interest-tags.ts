import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import { getInterestTags, getInterestTagById } from "../../infra/supabase/repositories/interest-tags.js";

const router: ExpressRouter = Router();
const logger = new Logger("ResourcesInterestTagsRoute");

router.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, count } = await getInterestTags({
      category,
      isActive: true,
      search,
      limit,
      offset,
    });

    logger.info("Interest tags fetched:", { count, limit, offset });

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
    logger.error("Unexpected error in GET /interest-tags:", error instanceof Error ? error.message : "Unknown error");
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

    if (!tag.is_active) {
      return res.status(404).json({
        error: "Not Found",
        message: "Interest tag not found",
      });
    }

    logger.info("Interest tag fetched:", id);

    return res.json(tag);
  } catch (error) {
    logger.error("Unexpected error in GET /interest-tags/:id:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch interest tag",
    });
  }
});

export default router;
