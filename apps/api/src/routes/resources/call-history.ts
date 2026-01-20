import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "../../infra/supabase/client.js";
import {
  createCallHistory,
  getCallHistoryByUserId,
  getCallHistoryById,
  getUserIdByClerkId,
  getUserCountry,
} from "../../infra/supabase/repositories/call-history.js";
import { Logger } from "../../utils/logger.js";

const router: ExpressRouter = Router();
const logger = new Logger("ResourcesCallHistoryRoute");

router.get("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, count } = await getCallHistoryByUserId(userId, { limit, offset });

    const enrichedData = await Promise.all(
      data.map(async (call) => {
        const isCaller = call.caller_id === userId;
        const otherUserId = isCaller ? call.callee_id : call.caller_id;
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const callHistory = await getCallHistoryById(id);
    if (!callHistory) {
      return res.status(404).json({
        error: "Not Found",
        message: "Call history record not found",
      });
    }

    if (callHistory.caller_id !== userId && callHistory.callee_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this call history record",
      });
    }

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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    if (!caller_id || !callee_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "caller_id and callee_id are required",
      });
    }

    if (caller_id !== userId && callee_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only create call history records for yourself",
      });
    }

    const callerCountry = await getUserCountry(caller_id);
    const calleeCountry = await getUserCountry(callee_id);

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
