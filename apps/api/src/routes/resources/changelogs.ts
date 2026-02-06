import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import { getChangelogs, getChangelogByVersion } from "@/infra/supabase/repositories/changelogs.js";
import { getDownloadUrl } from "@/infra/s3/presigned.js";
import { config } from "@/config/index.js";
import { getCachedData } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:resources:changelogs");

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.order_by as "release_date" | "order") || "release_date";

    const shouldCache = limit === 50 && offset === 0 && orderBy === "release_date";

    let changelogs, count;

    if (shouldCache) {
      ({ data: changelogs, count } = await getCachedData(
        CACHE_KEYS.changelogs(),
        () => getChangelogs({
          limit,
          offset,
          orderBy,
        }),
        CACHE_TTL.CHANGELOGS
      ));
    } else {
      ({ data: changelogs, count } = await getChangelogs({
        limit,
        offset,
        orderBy,
      }));
    }

    return res.json({
      data: changelogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    logger.error("Unexpected error in GET /changelogs: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch changelogs",
    });
  }
});

router.get("/:version", async (req: Request, res: Response) => {
  try {
    const { version } = req.params;

    if (!version || typeof version !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid version",
      });
    }

    const changelog = await getCachedData(
      CACHE_KEYS.changelog(version),
      async () => {
        const changelog = await getChangelogByVersion(version);
        if (!changelog) {
          throw new Error("Changelog not found");
        }
        return changelog;
      },
      CACHE_TTL.CHANGELOGS
    );

    let downloadUrl: string | null = null;
    if (changelog.s3_key && config.s3Bucket) {
      try {
        downloadUrl = await getDownloadUrl(config.s3Bucket, changelog.s3_key, 3600);
      } catch (s3Error: unknown) {
        logger.warn("Failed to generate presigned URL for changelog: %s, %s, %o", version, changelog.s3_key, s3Error instanceof Error ? s3Error : new Error(String(s3Error)));
      }
    }

    return res.json({
      ...changelog,
      download_url: downloadUrl,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Changelog not found") {
      return res.status(404).json({
        error: "Not Found",
        message: "Changelog not found",
      });
    }

    logger.error("Unexpected error in GET /changelogs/:version: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch changelog",
    });
  }
});

export default router;
