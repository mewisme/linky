import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import { sendBroadcastToAllUsers } from "@/contexts/broadcast-context.js";
import { listBroadcastHistory } from "@/infra/supabase/repositories/broadcast-history.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:broadcasts:route");

interface BroadcastBody {
  message: string;
  title?: string;
  deliveryMode?: "push_only" | "push_and_save";
  url?: string;
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
    logger.error("Unexpected error in GET /admin/broadcasts: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to list broadcasts",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const createdByUserId = await getUserIdByClerkId(clerkUserId);
    if (!createdByUserId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { message, title, deliveryMode, url } = req.body as BroadcastBody;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Bad Request",
        message: "message is required and must be a non-empty string",
      });
    }

    if (deliveryMode && deliveryMode !== "push_only" && deliveryMode !== "push_and_save") {
      return res.status(400).json({
        error: "Bad Request",
        message: "deliveryMode must be push_only or push_and_save",
      });
    }

    let trimmedUrl: string | undefined;
    if (url !== undefined) {
      if (typeof url !== "string") {
        return res.status(400).json({
          error: "Bad Request",
          message: "url must be a string",
        });
      }
      trimmedUrl = url.trim();
      if (trimmedUrl) {
        if (!trimmedUrl.startsWith("/")) {
          return res.status(400).json({
            error: "Bad Request",
            message: "url must start with /",
          });
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

    return res.status(201).json({
      sent,
      message:
        deliveryMode === "push_only"
          ? `Push sent to ${sent} user(s).`
          : `Broadcast sent to ${sent} user(s).`,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /admin/broadcasts: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to send broadcast",
    });
  }
});

export default router;
