import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { config } from "../../config/index.js";
import { Logger } from "../../utils/logger.js";
import {
  getUploadUrl,
  getDownloadUrl,
} from "../../infra/s3/presigned.js";
import {
  deleteObject,
  listObjects,
} from "../../infra/s3/object.js";
import {
  startMultipart,
  getPartUploadUrl,
  completeMultipart,
  abortMultipart,
} from "../../infra/s3/multipart.js";

const router: ExpressRouter = Router();
const logger = new Logger("MediaS3Route");

router.get("/presigned/upload", async (req: Request, res: Response) => {
  try {
    const { key, expires } = req.query;

    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required query parameter: key",
      });
    }

    const expiresIn = expires ? Number(expires) : 300;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    logger.info(`Generating upload presigned URL for key: ${key}`, {
      userId: req.auth?.sub,
      expiresIn,
    });

    const url = await getUploadUrl(bucket, key, expiresIn);

    return res.json({
      url,
      key,
      expiresIn,
      method: "PUT",
    });
  } catch (error) {
    logger.error("Error generating upload presigned URL", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate upload URL",
    });
  }
});

router.get("/presigned/download", async (req: Request, res: Response) => {
  try {
    const { key, expires } = req.query;

    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required query parameter: key",
      });
    }

    const expiresIn = expires ? Number(expires) : 300;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    logger.info(`Generating download presigned URL for key: ${key}`, {
      userId: req.auth?.sub,
      expiresIn,
    });

    const url = await getDownloadUrl(bucket, key, expiresIn);

    return res.json({
      url,
      key,
      expiresIn,
      method: "GET",
    });
  } catch (error) {
    logger.error("Error generating download presigned URL", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate download URL",
    });
  }
});

router.get("/objects", async (req: Request, res: Response) => {
  try {
    const { prefix } = req.query;
    const bucket = config.s3Bucket;

    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    logger.info("Listing objects", {
      userId: req.auth?.sub,
      prefix: prefix as string | undefined,
    });

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
  } catch (error) {
    logger.error("Error listing objects", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to list objects",
    });
  }
});

router.delete("/objects/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required parameter: key",
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

    const decodedKey = decodeURIComponent(key);

    logger.info(`Deleting object: ${decodedKey}`, {
      userId: req.auth?.sub,
    });

    await deleteObject(bucket, decodedKey);

    return res.json({
      success: true,
      message: "Object deleted successfully",
      key: decodedKey,
    });
  } catch (error) {
    logger.error("Error deleting object", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete object",
    });
  }
});

router.post("/multipart/start", async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: key",
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

    logger.info(`Starting multipart upload for key: ${key}`, {
      userId: req.auth?.sub,
    });

    const uploadId = await startMultipart(bucket, key);

    return res.json({
      uploadId,
      key,
    });
  } catch (error) {
    logger.error("Error starting multipart upload", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to start multipart upload",
    });
  }
});

router.get("/multipart/:uploadId/part/:partNumber", async (req: Request, res: Response) => {
  try {
    const { uploadId, partNumber } = req.params;

    if (!uploadId || !partNumber) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required route parameters",
      });
    }

    const keyParam = req.query.key;

    if (!keyParam || typeof keyParam !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required query parameter: key",
      });
    }

    const key: string = keyParam;
    const partNum = Number(partNumber);
    if (isNaN(partNum) || partNum < 1) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid part number",
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

    logger.info(`Getting part upload URL for multipart upload`, {
      userId: req.auth?.sub,
      uploadId,
      partNumber: partNum,
      key,
    });

    const url = await getPartUploadUrl(bucket, key, uploadId, partNum);

    return res.json({
      url,
      uploadId,
      partNumber: partNum,
      key,
    });
  } catch (error) {
    logger.error("Error getting part upload URL", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to get part upload URL",
    });
  }
});

router.post("/multipart/complete", async (req: Request, res: Response) => {
  try {
    const { key, uploadId, parts } = req.body;

    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: key",
      });
    }

    if (!uploadId || typeof uploadId !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: uploadId",
      });
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing or empty required field: parts",
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

    logger.info(`Completing multipart upload`, {
      userId: req.auth?.sub,
      uploadId,
      key,
      partsCount: parts.length,
    });

    await completeMultipart(
      bucket,
      key,
      uploadId,
      parts.map((part: { partNumber: number; etag: string }) => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      }))
    );

    return res.json({
      success: true,
      message: "Multipart upload completed successfully",
      key,
      uploadId,
    });
  } catch (error) {
    logger.error("Error completing multipart upload", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to complete multipart upload",
    });
  }
});

router.post("/multipart/abort", async (req: Request, res: Response) => {
  try {
    const { key, uploadId } = req.body;

    if (!key || typeof key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: key",
      });
    }

    if (!uploadId || typeof uploadId !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required field: uploadId",
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

    logger.info(`Aborting multipart upload`, {
      userId: req.auth?.sub,
      uploadId,
      key,
    });

    await abortMultipart(bucket, key as string, uploadId);

    return res.json({
      success: true,
      message: "Multipart upload aborted successfully",
      key,
      uploadId,
    });
  } catch (error) {
    logger.error("Error aborting multipart upload", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to abort multipart upload",
    });
  }
});

export default router;

