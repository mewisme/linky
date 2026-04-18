import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import {
  getUploadUrl,
  getDownloadUrl,
} from "@/infra/s3/presigned.js";
import {
  deleteObject,
  listObjects,
} from "@/infra/s3/object.js";
import {
  startMultipart,
  getPartUploadUrl,
  completeMultipart,
  abortMultipart,
} from "@/infra/s3/multipart.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:media:s3");

const umS3Bucket = () =>
  um("S3_BUCKET_NOT_CONFIGURED", "s3BucketNotConfigured", "S3 bucket not configured");

router.get("/presigned/upload", async (req: Request, res: Response) => {
  try {
    const { key, expires } = req.query;

    if (!key || typeof key !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_QUERY_KEY", "missingQueryKey", "Missing required query parameter: key"),
      );
    }

    const expiresIn = expires ? Number(expires) : 300;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const url = await getUploadUrl(bucket, key, expiresIn);

    return res.json({
      url,
      key,
      expiresIn,
      method: "PUT",
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error generating upload presigned URL");
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
    const { key, expires } = req.query;

    if (!key || typeof key !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_QUERY_KEY_DL", "missingQueryKey", "Missing required query parameter: key"),
      );
    }

    const expiresIn = expires ? Number(expires) : 300;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const url = await getDownloadUrl(bucket, key, expiresIn);

    return res.json({
      url,
      key,
      expiresIn,
      method: "GET",
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error generating download presigned URL");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_DOWNLOAD_URL", "failedDownloadUrl", "Failed to generate download URL"),
    );
  }
});

router.get("/objects", async (req: Request, res: Response) => {
  try {
    const { prefix } = req.query;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const result = await listObjects(bucket, prefix as string | undefined);

    return res.json({
      objects: result.Contents?.map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      })) || [],
      prefix: prefix as string | undefined,
      isTruncated: result.IsTruncated,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error listing objects");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_LIST_OBJECTS", "failedListObjects", "Failed to list objects"),
    );
  }
});

router.delete("/objects/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params as { key: string };

    if (!key) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_PARAM_KEY", "missingFieldKey", "Missing required parameter: key"),
      );
    }

    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const decodedKey = decodeURIComponent(key);

    await deleteObject(bucket, decodedKey);

    return sendJsonWithUserMessage(
      res,
      200,
      { success: true as const, key: decodedKey },
      um("OBJECT_DELETED", "objectDeleted", "Object deleted successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error deleting object");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_DELETE_OBJECT", "failedDeleteObject", "Failed to delete object"),
    );
  }
});

router.post("/multipart/start", async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key || typeof key !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_FIELD_KEY", "missingFieldKey", "Missing required field: key"),
      );
    }

    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const uploadId = await startMultipart(bucket, key);

    return res.json({
      uploadId,
      key,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error starting multipart upload");
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

    if (!keyParam || typeof keyParam !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_MISSING_QUERY_KEY_PART", "missingQueryKey", "Missing required query parameter: key"),
      );
    }

    const key: string = keyParam;
    const partNum = Number(partNumber);
    if (isNaN(partNum) || partNum < 1) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_INVALID_PART", "invalidPartNumber", "Invalid part number"),
      );
    }

    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    const url = await getPartUploadUrl(bucket, key, uploadId, partNum);

    return res.json({
      url,
      uploadId,
      partNumber: partNum,
      key,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error getting part upload URL");
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
    const { key, uploadId, parts } = req.body;

    if (!key || typeof key !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_COMPLETE_MISSING_KEY", "missingFieldKey", "Missing required field: key"),
      );
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

    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    await completeMultipart(
      bucket,
      key,
      uploadId,
      parts.map((part: { partNumber: number; etag: string }) => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      }))
    );

    return sendJsonWithUserMessage(
      res,
      200,
      { success: true as const, key, uploadId },
      um("MULTIPART_COMPLETE_OK", "multipartCompleteSuccess", "Multipart upload completed successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error completing multipart upload");
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
    const { key, uploadId } = req.body;

    if (!key || typeof key !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_ABORT_MISSING_KEY", "missingFieldKey", "Missing required field: key"),
      );
    }

    if (!uploadId || typeof uploadId !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("S3_ABORT_MISSING_UPLOAD", "missingFieldUploadId", "Missing required field: uploadId"),
      );
    }

    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return sendJsonError(res, 500, "Internal Server Error", umS3Bucket());
    }

    await abortMultipart(bucket, key as string, uploadId);

    return sendJsonWithUserMessage(
      res,
      200,
      { success: true as const, key, uploadId },
      um("MULTIPART_ABORT_OK", "multipartAbortedSuccess", "Multipart upload aborted successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error aborting multipart upload");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_ABORT_MULTIPART", "failedAbortMultipart", "Failed to abort multipart upload"),
    );
  }
});

export default router;
