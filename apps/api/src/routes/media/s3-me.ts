import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "@/config/index.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { isValidUserKey } from "@/lib/s3/key-scoping.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getDownloadUrl, getUploadUrl } from "@/infra/s3/presigned.js";
import {
  abortMultipart,
  completeMultipart,
  getPartUploadUrl,
  startMultipart,
} from "@/infra/s3/multipart.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:media:s3-me");

const umS3Bucket = () =>
  um("S3_BUCKET_NOT_CONFIGURED", "s3BucketNotConfigured", "S3 bucket not configured");

const umKeyOutsideUserPrefix = () =>
  um(
    "S3_KEY_OUTSIDE_USER_PREFIX",
    "s3KeyOutsideUserPrefix",
    "Key must be scoped to your own user prefix",
  );

async function resolveAuthenticatedUser(
  req: Request,
  res: Response,
): Promise<{ userId: string } | null> {
  const clerkUserId = req.auth?.sub;
  if (!clerkUserId) {
    sendJsonError(
      res,
      401,
      "Unauthorized",
      um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
    );
    return null;
  }

  const userId = await getUserIdByClerkId(clerkUserId);
  if (!userId) {
    sendJsonError(
      res,
      404,
      "Not Found",
      um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
    );
    return null;
  }

  return { userId };
}

function getBucketOrFail(res: Response): string | null {
  const bucket = config.s3Bucket;
  if (!bucket) {
    logger.error("S3_BUCKET not configured");
    sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    return null;
  }
  return bucket;
}

router.get("/presigned/upload", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { key, expires } = req.query;
    if (!isValidUserKey(key, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    const expiresIn = expires ? Number(expires) : 300;
    const url = await getUploadUrl(bucket, key, expiresIn);

    return res.json({ url, key, expiresIn, method: "PUT" });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error generating upload presigned URL for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPLOAD_URL", "failedUploadUrl", "Failed to generate upload URL"),
    );
  }
});

router.get("/presigned/download", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { key, expires } = req.query;
    if (!isValidUserKey(key, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    const expiresIn = expires ? Number(expires) : 300;
    const url = await getDownloadUrl(bucket, key, expiresIn);

    return res.json({ url, key, expiresIn, method: "GET" });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error generating download presigned URL for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_DOWNLOAD_URL", "failedDownloadUrl", "Failed to generate download URL"),
    );
  }
});

router.post("/multipart/start", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { key } = req.body as { key?: unknown };
    if (!isValidUserKey(key, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    const uploadId = await startMultipart(bucket, key);

    return res.json({ uploadId, key });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error starting multipart upload for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_START_MULTIPART", "failedStartMultipart", "Failed to start multipart upload"),
    );
  }
});

router.get("/multipart/:uploadId/part/:partNumber", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { uploadId, partNumber } = req.params as { uploadId: string; partNumber: string };
    if (!uploadId || !partNumber) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_ROUTE_PARAMS", "missingRouteParams", "Missing required route parameters"),
      );
    }

    const keyParam = req.query.key;
    if (!isValidUserKey(keyParam, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    const partNum = Number(partNumber);
    if (isNaN(partNum) || partNum < 1) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_INVALID_PART", "invalidPartNumber", "Invalid part number"),
      );
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    const url = await getPartUploadUrl(bucket, keyParam, uploadId, partNum);

    return res.json({ url, uploadId, partNumber: partNum, key: keyParam });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error getting part upload URL for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_PART_UPLOAD_URL", "failedPartUploadUrl", "Failed to get part upload URL"),
    );
  }
});

router.post("/multipart/complete", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { key, uploadId, parts } = req.body as {
      key?: unknown;
      uploadId?: unknown;
      parts?: unknown;
    };

    if (!isValidUserKey(key, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    if (!uploadId || typeof uploadId !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_COMPLETE_MISSING_UPLOAD", "missingFieldUploadId", "Missing required field: uploadId"),
      );
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_COMPLETE_MISSING_PARTS", "missingOrEmptyParts", "Missing or empty required field: parts"),
      );
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    await completeMultipart(
      bucket,
      key,
      uploadId,
      parts.map((part: { partNumber: number; etag: string }) => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      })),
    );

    return sendJsonWithUserMessage(
      res,
      200,
      { success: true as const, key, uploadId },
      um("MULTIPART_COMPLETE_OK", "multipartCompleteSuccess", "Multipart upload completed successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error completing multipart upload for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_COMPLETE_MULTIPART", "failedCompleteMultipart", "Failed to complete multipart upload"),
    );
  }
});

router.post("/multipart/abort", async (req: Request, res: Response) => {
  try {
    const auth = await resolveAuthenticatedUser(req, res);
    if (!auth) return;

    const { key, uploadId } = req.body as { key?: unknown; uploadId?: unknown };

    if (!isValidUserKey(key, auth.userId)) {
      return sendJsonError(res, 400, "Bad Request", umKeyOutsideUserPrefix());
    }

    if (!uploadId || typeof uploadId !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_ABORT_MISSING_UPLOAD", "missingFieldUploadId", "Missing required field: uploadId"),
      );
    }

    const bucket = getBucketOrFail(res);
    if (!bucket) return;

    await abortMultipart(bucket, key, uploadId);

    return sendJsonWithUserMessage(
      res,
      200,
      { success: true as const, key, uploadId },
      um("MULTIPART_ABORT_OK", "multipartAbortedSuccess", "Multipart upload aborted successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error aborting multipart upload for me/s3");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_ABORT_MULTIPART", "failedAbortMultipart", "Failed to abort multipart upload"),
    );
  }
});

export default router;
