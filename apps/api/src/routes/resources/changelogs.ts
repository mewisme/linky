import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Logger } from "../../utils/logger.js";
import { getChangelogs, getChangelogByVersion } from "../../lib/supabase/queries/changelogs.js";
import { getDownloadUrl } from "../../lib/s3/presigned.js";
import { config } from "../../config/index.js";

const router: ExpressRouter = Router();
const logger = new Logger("ResourcesChangelogsRoute");

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.order_by as "release_date" | "order") || "release_date";

    const { data: changelogs, count } = await getChangelogs({
      limit,
      offset,
      orderBy,
    });

    logger.info("Published changelogs fetched:", { count, limit, offset });

    return res.json({
      data: changelogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /changelogs:", error instanceof Error ? error.message : "Unknown error");
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

    const changelog = await getChangelogByVersion(version);

    if (!changelog) {
      return res.status(404).json({
        error: "Not Found",
        message: "Changelog not found",
      });
    }

    let downloadUrl: string | null = null;
    if (changelog.s3_key && config.s3Bucket) {
      try {
        downloadUrl = await getDownloadUrl(config.s3Bucket, changelog.s3_key, 3600);
      } catch (s3Error) {
        logger.warn("Failed to generate presigned URL for changelog:", {
          version,
          s3Key: changelog.s3_key,
          error: s3Error instanceof Error ? s3Error.message : "Unknown error",
        });
      }
    }

    logger.info("Changelog fetched:", version);

    return res.json({
      ...changelog,
      download_url: downloadUrl,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /changelogs/:version:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch changelog",
    });
  }
});

export default router;
