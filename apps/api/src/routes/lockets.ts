import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../lib/supabase/client.js";
import { logger } from "../utils/logger.js";
import type { TablesInsert, TablesUpdate } from "../types/database.types.js";
import { getDownloadUrl } from "../lib/s3/presigned.js";
import { config } from "../config/index.js";

const router: ExpressRouter = Router();

/**
 * GET /api/v1/lockets
 * Get lockets with pagination (offset, limit)
 * Query parameters:
 *   - offset: number (default: 0) - Number of records to skip
 *   - limit: number (default: 10) - Number of records to return
 *   - expires: number (default: 3600) - TTL for presigned URLs in seconds
 * Always sorted by created_at DESC (newest first)
 * Requires authentication via clerkMiddleware
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    // Parse query parameters
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const expires = parseInt(req.query.expires as string, 10) || 3600; // Default 1 hour

    // Validate parameters
    if (offset < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "offset must be a non-negative number",
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "limit must be between 1 and 100",
      });
    }

    if (expires < 60 || expires > 86400) {
      return res.status(400).json({
        error: "Bad Request",
        message: "expires must be between 60 and 86400 seconds",
      });
    }

    logger.info("Fetching lockets with pagination", { offset, limit, expires });

    // Query lockets with joined user information, pagination, and sorting
    // Note: We need separate queries for data and count due to nested select
    const locketsQuery = supabase
      .from("lockets")
      .select(
        `
        *,
        users:user_id (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          created_at,
          updated_at
        )
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const countQuery = supabase
      .from("lockets")
      .select("*", { count: "exact", head: true });

    const [{ data: lockets, error }, { count }] = await Promise.all([
      locketsQuery,
      countQuery,
    ]);

    if (error) {
      logger.error("Error fetching lockets from database", { error });
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch lockets",
      });
    }

    // Generate presigned URLs for image_path
    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    const locketsWithPresignedUrls = await Promise.all(
      (lockets || []).map(async (locket) => {
        try {
          const imageUrl = await getDownloadUrl(bucket, locket.image_path, expires);
          return {
            ...locket,
            image_url: imageUrl,
            image_path: locket.image_path, // Keep original path for reference
          };
        } catch (urlError) {
          logger.error("Error generating presigned URL for locket", {
            locketId: locket.id,
            imagePath: locket.image_path,
            error: urlError,
          });
          // Return locket without presigned URL if generation fails
          return {
            ...locket,
            image_url: null,
            image_path: locket.image_path,
          };
        }
      })
    );

    const totalCount = count || 0;
    const hasMore = offset + (lockets?.length || 0) < totalCount;

    logger.info("Lockets fetched successfully", {
      count: lockets?.length || 0,
      offset,
      limit,
      totalCount,
      hasMore,
    });

    return res.json({
      data: locketsWithPresignedUrls,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore,
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /lockets endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * GET /api/v1/lockets/:id
 * Get a single locket by ID with user information
 * Query parameters:
 *   - expires: number (default: 3600) - TTL for presigned URL in seconds
 * Requires authentication via clerkMiddleware
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { id } = req.params;
    const expires = parseInt(req.query.expires as string, 10) || 3600; // Default 1 hour

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Locket ID is required",
      });
    }

    if (expires < 60 || expires > 86400) {
      return res.status(400).json({
        error: "Bad Request",
        message: "expires must be between 60 and 86400 seconds",
      });
    }

    logger.info("Fetching locket by ID", { locketId: id, expires });

    // Query single locket with joined user information
    const { data: locket, error } = await supabase
      .from("lockets")
      .select(`
        *,
        users:user_id (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          created_at,
          updated_at
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching locket from database", { error, locketId: id });

      // If locket not found, return 404
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Not Found",
          message: "Locket not found",
        });
      }

      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch locket",
      });
    }

    if (!locket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Locket not found",
      });
    }

    // Generate presigned URL for image_path
    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    let imageUrl: string | null = null;
    try {
      imageUrl = await getDownloadUrl(bucket, locket.image_path, expires);
    } catch (urlError) {
      logger.error("Error generating presigned URL for locket", {
        locketId: id,
        imagePath: locket.image_path,
        error: urlError,
      });
    }

    logger.info("Locket fetched successfully", { locketId: id });

    return res.json({
      ...locket,
      image_url: imageUrl,
      image_path: locket.image_path, // Keep original path for reference
    });
  } catch (error) {
    logger.error("Unexpected error in GET /lockets/:id endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * POST /api/v1/lockets
 * Create a new locket
 * Query parameters:
 *   - expires: number (default: 3600) - TTL for presigned URL in seconds
 * Requires authentication via clerkMiddleware
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const expires = parseInt(req.query.expires as string, 10) || 3600; // Default 1 hour

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    if (expires < 60 || expires > 86400) {
      return res.status(400).json({
        error: "Bad Request",
        message: "expires must be between 60 and 86400 seconds",
      });
    }

    // Get user from database to get user_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      logger.error("Error fetching user from database", { error: userError, clerkUserId });
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { image_path, caption } = req.body;

    if (!image_path) {
      return res.status(400).json({
        error: "Bad Request",
        message: "image_path is required",
      });
    }

    logger.info("Creating new locket", { userId: user.id });

    const locketData: TablesInsert<"lockets"> = {
      user_id: user.id,
      image_path,
      caption: caption || null,
    };

    const { data: locket, error } = await supabase
      .from("lockets")
      .insert(locketData)
      .select(`
        *,
        users:user_id (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      logger.error("Error creating locket in database", { error });
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create locket",
      });
    }

    // Generate presigned URL for image_path
    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    let imageUrl: string | null = null;
    try {
      imageUrl = await getDownloadUrl(bucket, locket.image_path, expires);
    } catch (urlError) {
      logger.error("Error generating presigned URL for locket", {
        locketId: locket?.id,
        imagePath: locket?.image_path,
        error: urlError,
      });
    }

    logger.info("Locket created successfully", { locketId: locket?.id });

    return res.status(201).json({
      ...locket,
      image_url: imageUrl,
      image_path: locket.image_path, // Keep original path for reference
    });
  } catch (error) {
    logger.error("Unexpected error in POST /lockets endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * PUT /api/v1/lockets/:id
 * Update an existing locket
 * Query parameters:
 *   - expires: number (default: 3600) - TTL for presigned URL in seconds
 * Requires authentication via clerkMiddleware
 * Only the owner can update their locket
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { id } = req.params;
    const expires = parseInt(req.query.expires as string, 10) || 3600; // Default 1 hour

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Locket ID is required",
      });
    }

    if (expires < 60 || expires > 86400) {
      return res.status(400).json({
        error: "Bad Request",
        message: "expires must be between 60 and 86400 seconds",
      });
    }

    // Get user from database to get user_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      logger.error("Error fetching user from database", { error: userError, clerkUserId });
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    // Check if locket exists and belongs to user
    const { data: existingLocket, error: checkError } = await supabase
      .from("lockets")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !existingLocket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Locket not found",
      });
    }

    if (existingLocket.user_id !== user.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only update your own lockets",
      });
    }

    const { image_path, caption } = req.body;

    const updateData: TablesUpdate<"lockets"> = {};
    if (image_path !== undefined) updateData.image_path = image_path;
    if (caption !== undefined) updateData.caption = caption;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "No fields to update",
      });
    }

    logger.info("Updating locket", { locketId: id, userId: user.id });

    const { data: locket, error } = await supabase
      .from("lockets")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        users:user_id (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      logger.error("Error updating locket in database", { error, locketId: id });
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update locket",
      });
    }

    // Generate presigned URL for image_path
    const bucket = config.s3Bucket;
    if (!bucket) {
      logger.error("S3_BUCKET not configured");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "S3 bucket not configured",
      });
    }

    let imageUrl: string | null = null;
    try {
      imageUrl = await getDownloadUrl(bucket, locket.image_path, expires);
    } catch (urlError) {
      logger.error("Error generating presigned URL for locket", {
        locketId: id,
        imagePath: locket.image_path,
        error: urlError,
      });
    }

    logger.info("Locket updated successfully", { locketId: id });

    return res.json({
      ...locket,
      image_url: imageUrl,
      image_path: locket.image_path, // Keep original path for reference
    });
  } catch (error) {
    logger.error("Unexpected error in PUT /lockets/:id endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

/**
 * DELETE /api/v1/lockets/:id
 * Delete an existing locket
 * Requires authentication via clerkMiddleware
 * Only the owner can delete their locket
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { id } = req.params;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Locket ID is required",
      });
    }

    // Get user from database to get user_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      logger.error("Error fetching user from database", { error: userError, clerkUserId });
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    // Check if locket exists and belongs to user
    const { data: existingLocket, error: checkError } = await supabase
      .from("lockets")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !existingLocket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Locket not found",
      });
    }

    if (existingLocket.user_id !== user.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete your own lockets",
      });
    }

    logger.info("Deleting locket", { locketId: id, userId: user.id });

    const { error } = await supabase
      .from("lockets")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting locket from database", { error, locketId: id });
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete locket",
      });
    }

    logger.info("Locket deleted successfully", { locketId: id });

    return res.status(204).send();
  } catch (error) {
    logger.error("Unexpected error in DELETE /lockets/:id endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;

