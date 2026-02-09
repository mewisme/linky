import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { supabase } from "@/infra/supabase/client.js";
import {
  createCallHistory,
  getCallHistoryByUserId,
  getCallHistoryById,
  getUserIdByClerkId,
  getUserCountry,
} from "@/infra/supabase/repositories/call-history.js";
import { createLogger } from "@ws/logger";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:resources:call-history");

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

    const shouldCache = limit === 50 && offset === 0;

    let data, count;

    if (shouldCache) {
      ({ data, count } = await getCachedData(
        CACHE_KEYS.callHistory(userId),
        async () => {
          const result = await getCallHistoryByUserId(userId, { limit, offset });
          return result;
        },
        CACHE_TTL.CALL_HISTORY
      ));
    } else {
      ({ data, count } = await getCallHistoryByUserId(userId, { limit, offset }));
    }

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

    return res.json({
      data: enrichedData,
      count,
      limit,
      offset,
    });
  } catch (error: unknown) {
    logger.error(
      "Unexpected error in GET /call-history: %o",
      error instanceof Error ? error : new Error(String(error))
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
    const { id } = req.params as { id: string };

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

    const enrichedData = await getCachedData(
      CACHE_KEYS.callHistoryItem(id),
      async () => {
        const callHistory = await getCallHistoryById(id);
        if (!callHistory) {
          throw new Error("Call history record not found");
        }

        if (callHistory.caller_id !== userId && callHistory.callee_id !== userId) {
          throw new Error("Forbidden: You do not have access to this call history record");
        }

        const isCaller = callHistory.caller_id === userId;
        const otherUserId = isCaller ? callHistory.callee_id : callHistory.caller_id;

        const { data: otherUser } = await supabase
          .from("users")
          .select("id, first_name, last_name, avatar_url, country")
          .eq("id", otherUserId)
          .single();

        return {
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
      },
      CACHE_TTL.CALL_HISTORY
    );

    return res.json(enrichedData);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Call history record not found") {
        return res.status(404).json({
          error: "Not Found",
          message: "Call history record not found",
        });
      }
      if (error.message.includes("Forbidden")) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You do not have access to this call history record",
        });
      }
    }

    logger.error(
      "Unexpected error in GET /call-history/:id: %o",
      error instanceof Error ? error : new Error(String(error))
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

    await invalidateCacheKey(CACHE_KEYS.callHistory(caller_id));
    await invalidateCacheKey(CACHE_KEYS.callHistory(callee_id));
    await invalidateCacheKey(CACHE_KEYS.callHistoryItem(callHistory.id));

    return res.status(201).json(callHistory);
  } catch (error: unknown) {
    logger.error(
      "Unexpected error in POST /call-history: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create call history",
    });
  }
});

export default router;
