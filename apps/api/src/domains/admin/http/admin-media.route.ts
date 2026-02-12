import { randomUUID } from "crypto";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { getUploadUrl } from "@/infra/s3/presigned.js";
import { config } from "@/config/index.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:media:route");

const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

const INTENTS = ["reward", "feature"] as const;
type Intent = (typeof INTENTS)[number];

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

router.post("/presigned-upload", async (req: Request, res: Response) => {
  try {
    const body = req.body as { intent?: string; content_type?: string };

    if (!body.intent || typeof body.intent !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "intent is required and must be a string",
      });
    }

    if (!INTENTS.includes(body.intent as Intent)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "intent must be one of: reward, feature",
      });
    }

    if (!body.content_type || typeof body.content_type !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "content_type is required and must be a string",
      });
    }

    if (!ALLOWED_CONTENT_TYPES.includes(body.content_type as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      return res.status(400).json({
        error: "Bad Request",
        message: "content_type must be one of: image/png, image/jpeg, image/gif, image/webp",
      });
    }

    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    const ext = CONTENT_TYPE_TO_EXT[body.content_type] ?? "bin";
    const segment = body.intent === "reward" ? "rewards" : "features";
    const resourceKey = `admin/${segment}/${randomUUID()}.${ext}`;
    const expiresIn = 300;

    const uploadUrl = await getUploadUrl(bucket, resourceKey, expiresIn);

    return res.json({
      upload_url: uploadUrl,
      resource_key: resourceKey,
      resource_type: "s3",
      expires_in: expiresIn,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/media/presigned-upload: %o",
      error as Error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate presigned upload URL",
    });
  }
});

export default router;
