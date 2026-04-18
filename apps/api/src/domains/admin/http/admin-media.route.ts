import { randomUUID } from "crypto";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("ADMIN_MEDIA_INTENT", "intentRequiredString", "intent is required and must be a string"),
      );
    }

    if (!INTENTS.includes(body.intent as Intent)) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("ADMIN_MEDIA_INTENT_INVALID", "intentInvalid", "intent must be one of: reward, feature"),
      );
    }

    if (!body.content_type || typeof body.content_type !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("ADMIN_MEDIA_CT", "contentTypeRequiredString", "content_type is required and must be a string"),
      );
    }

    if (!ALLOWED_CONTENT_TYPES.includes(body.content_type as (typeof ALLOWED_CONTENT_TYPES)[number])) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("ADMIN_MEDIA_CT_INVALID", "contentTypeInvalid", "content_type must be one of: image/png, image/jpeg, image/gif, image/webp"),
      );
    }

    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        um("ADMIN_MEDIA_S3", "s3BucketNotConfigured", "S3 bucket not configured"),
      );
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
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/media/presigned-upload");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("ADMIN_MEDIA_PRESIGN_FAIL", "failedPresignedUploadUrl", "Failed to generate presigned upload URL"),
    );
  }
});

export default router;
