import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../lib/supabase/client.js";
import {
  createCallHistory,
  getCallHistoryByUserId,
  getCallHistoryById,
  getUserIdByClerkId,
  getUserCountry,
} from "../lib/supabase/queries/call-history.js";
import { logger } from "../utils/logger.js";

const router: ExpressRouter = Router();

/**
 * GET /api/v1/call-history
 * Get call history for the current authenticated user
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

    // Get database user ID from Clerk user ID
    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch call history
    const { data, count } = await getCallHistoryByUserId(userId, { limit, offset });

    // Enrich with caller/callee user information
    const enrichedData = await Promise.all(
      data.map(async (call) => {
        const isCaller = call.caller_id === userId;
        const otherUserId = isCaller ? call.callee_id : call.caller_id;

        // Get other user's information
        const { data: otherUser } = await supabase
          .from("users")
          .select("id, first_name, last_name, avatar_url, country")
          .eq("id", otherUserId)
          .single();

        return {
          ...call,
          other_user: otherUser
            ? {
              id: otherUser.id,
              name: `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim() || "Anonymous",
              avatar_url: otherUser.avatar_url,
              country: otherUser.country,
            }
            : null,
          is_caller: isCaller,
        };
      })
    );

    logger.info("Call history fetched for user:", userId, "Count:", count);

    return res.json({
      data: enrichedData,
      count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /call-history:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch call history",
    });
  }
});

/**
 * GET /api/v1/call-history/:id
 * Get a specific call history record by ID
 * Requires authentication via clerkMiddleware
 */
router.get("/:id", async (req: Request, res: Response) => {
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
        message: "Call history ID is required",
      });
    }

    // Get database user ID from Clerk user ID
    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    // Fetch call history record
    const callHistory = await getCallHistoryById(id);
    if (!callHistory) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call history record not found",
      });
    }

    // Verify user has access to this record (must be caller or callee)
    if (callHistory.caller_id !== userId && callHistory.callee_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this call history record",
      });
    }

    // Enrich with user information
    const isCaller = callHistory.caller_id === userId;
    const otherUserId = isCaller ? callHistory.callee_id : callHistory.caller_id;

    const { data: otherUser } = await supabase
      .from("users")
      .select("id, first_name, last_name, avatar_url, country")
      .eq("id", otherUserId)
      .single();

    const enrichedData = {
      ...callHistory,
      other_user: otherUser
        ? {
          id: otherUser.id,
          name: `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim() || "Anonymous",
          avatar_url: otherUser.avatar_url,
          country: otherUser.country,
        }
        : null,
      is_caller: isCaller,
    };

    logger.info("Call history fetched:", id, "for user:", userId);

    return res.json(enrichedData);
  } catch (error) {
    logger.error(
      "Unexpected error in GET /call-history/:id:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch call history",
    });
  }
});

/**
 * POST /api/v1/call-history
 * Create a new call history record
 * Requires authentication via clerkMiddleware
 * This endpoint is typically called internally by the socket handler
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { caller_id, callee_id, started_at, ended_at, duration_seconds } = req.body;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    // Get database user ID from Clerk user ID
    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    // Validate required fields
    if (!caller_id || !callee_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "caller_id and callee_id are required",
      });
    }

    // Verify user is either caller or callee
    if (caller_id !== userId && callee_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only create call history records for yourself",
      });
    }

    // Get countries for both users
    const callerCountry = await getUserCountry(caller_id);
    const calleeCountry = await getUserCountry(callee_id);

    // Create call history record
    const callHistory = await createCallHistory({
      callerId: caller_id,
      calleeId: callee_id,
      callerCountry,
      calleeCountry,
      startedAt: started_at ? new Date(started_at) : new Date(),
      endedAt: ended_at ? new Date(ended_at) : undefined,
      durationSeconds: duration_seconds,
    });

    logger.info("Call history created:", callHistory.id, "for users:", caller_id, callee_id);

    return res.status(201).json(callHistory);
  } catch (error) {
    logger.error(
      "Unexpected error in POST /call-history:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create call history",
    });
  }
});

export default router;
