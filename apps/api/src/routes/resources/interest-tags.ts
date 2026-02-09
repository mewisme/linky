import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { getInterestTags, getInterestTagById } from "@/infra/supabase/repositories/interest-tags.js";
import { getCachedData } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:resources:interest-tags");

router.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const shouldCache = !category && !search && limit <= 100 && offset === 0;

    let data, count;

    if (shouldCache) {
      ({ data, count } = await getCachedData(
        CACHE_KEYS.interestTags(),
        () => getInterestTags({
          category,
          isActive: true,
          search,
          limit,
          offset,
        }),
        CACHE_TTL.INTEREST_TAGS
      ));
    } else {
      ({ data, count } = await getInterestTags({
        category,
        isActive: true,
        search,
        limit,
        offset,
      }));
    }

    return res.json({
      data,
      pagination: {
        limit,
        offset,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: unknown) {
    logger.error("Unexpected error in GET /interest-tags: %o", error instanceof Error ? error : new Error(String(error)));
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

    const tag = await getCachedData(
      CACHE_KEYS.interestTag(id),
      async () => {
        const tag = await getInterestTagById(id);
        if (!tag || !tag.is_active) {
          throw new Error("Interest tag not found");
        }
        return tag;
      },
      CACHE_TTL.INTEREST_TAGS
    );

    return res.json(tag);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Interest tag not found") {
      return res.status(404).json({
        error: "Not Found",
        message: "Interest tag not found",
      });
    }

    logger.error("Unexpected error in GET /interest-tags/:id: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch interest tag",
    });
  }
});

export default router;
