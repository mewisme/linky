import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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

    const shouldCache = !category && !search && limit <= 200 && offset === 0;

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
    logger.error(toLoggableError(error), "Unexpected error in GET /interest-tags");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_INTEREST_TAGS", "failedFetchInterestTags", "Failed to fetch interest tags"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
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
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("INTEREST_TAG_NOT_FOUND", "interestTagNotFound", "Interest tag not found"),
      );
    }

    logger.error(toLoggableError(error), "Unexpected error in GET /interest-tags/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_INTEREST_TAG", "failedFetchInterestTag", "Failed to fetch interest tag"),
    );
  }
});

export default router;
