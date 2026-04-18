import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { sendBroadcastToAllUsers } from "@/contexts/broadcast-context.js";
import { generateBroadcastAiDraft } from "@/contexts/broadcast-ai-context.js";
import { listBroadcastHistory } from "@/infra/supabase/repositories/broadcast-history.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:broadcasts:route");

interface BroadcastBody {
  message: string;
  title?: string;
  deliveryMode?: "push_only" | "push_and_save";
  url?: string;
}

interface BroadcastAiGenerateBody {
  audience: string;
  key_points: string;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10) || 50, 100);
    const offset = parseInt((req.query.offset as string) || "0", 10) || 0;

    const { data, total } = await listBroadcastHistory({ limit, offset });

    return res.json({
      data,
      pagination: {
        limit,
        offset,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/broadcasts");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_LIST_BROADCASTS", "failedListBroadcasts", "Failed to list broadcasts"),
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const createdByUserId = await getUserIdByClerkId(clerkUserId);
    if (!createdByUserId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const { message, title, deliveryMode, url } = req.body as BroadcastBody;

    if (!message || typeof message !== "string" || !message.trim()) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("BROADCAST_MSG_REQUIRED", "broadcastMessageRequired", "message is required and must be a non-empty string"),
      );
    }

    if (deliveryMode && deliveryMode !== "push_only" && deliveryMode !== "push_and_save") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("BROADCAST_DELIVERY_INVALID", "broadcastDeliveryModeInvalid", "deliveryMode must be push_only or push_and_save"),
      );
    }

    let trimmedUrl: string | undefined;
    if (url !== undefined) {
      if (typeof url !== "string") {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          um("BROADCAST_URL_STRING", "broadcastUrlString", "url must be a string"),
        );
      }
      trimmedUrl = url.trim();
      if (trimmedUrl) {
        if (!trimmedUrl.startsWith("/")) {
          return sendJsonError(
            res,
            400,
            "Bad Request",
            um("BROADCAST_URL_PATH", "broadcastUrlPath", "url must start with /"),
          );
        }
      } else {
        trimmedUrl = undefined;
      }
    }

    const { sent } = await sendBroadcastToAllUsers({
      message: message.trim(),
      title: typeof title === "string" ? title.trim() || undefined : undefined,
      createdByUserId,
      deliveryMode,
      url: trimmedUrl,
    });

    const summary =
      deliveryMode === "push_only"
        ? `Push sent to ${sent} user(s).`
        : `Broadcast sent to ${sent} user(s).`;

    return sendJsonWithUserMessage(res, 201, { sent }, umDetail("BROADCAST_SENT", summary));
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/broadcasts");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_SEND_BROADCAST", "failedSendBroadcast", "Failed to send broadcast"),
    );
  }
});

router.post(
  "/ai-generate",
  createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 3 }),
  async (req: Request, res: Response) => {
    try {
      const clerkUserId = req.auth?.sub;

      if (!clerkUserId) {
        return sendJsonError(
          res,
          401,
          "Unauthorized",
          um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
        );
      }

      const createdByUserId = await getUserIdByClerkId(clerkUserId);
      if (!createdByUserId) {
        return sendJsonError(
          res,
          404,
          "Not Found",
          um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
        );
      }

      const { audience, key_points } = req.body as BroadcastAiGenerateBody;

      if (!audience || typeof audience !== "string" || !audience.trim()) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("BROADCAST_AI_AUDIENCE", "audience is required and must be a non-empty string"),
        );
      }

      if (!key_points || typeof key_points !== "string" || !key_points.trim()) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("BROADCAST_AI_KEYPOINTS", "key_points is required and must be a non-empty string"),
        );
      }

      const draft = await generateBroadcastAiDraft({
        audience,
        keyPoints: key_points,
        createdByUserId,
      });

      return res.json({ draft });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already in progress")) {
        return sendJsonError(res, 429, "Too Many Requests", umDetail("BROADCAST_AI_RATE", error.message));
      }

      logger.error(toLoggableError(error), "Unexpected error in POST /admin/broadcasts/ai-generate");
      return sendJsonError(
        res,
        500,
        "Internal Server Error",
        umDetail("BROADCAST_AI_FAIL", "Failed to generate broadcast draft"),
      );
    }
  },
);

export default router;
