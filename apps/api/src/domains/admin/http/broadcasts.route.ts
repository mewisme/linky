import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import { sendBroadcastToAllUsers } from "@/contexts/broadcast-context.js";
import { listBroadcastHistory } from "@/infra/supabase/repositories/broadcast-history.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:broadcasts:route");

interface BroadcastBody {
  message: string;
  title?: string;
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
    logger.error("Unexpected error in GET /admin/broadcasts: %o", error instanceof Error ? error : new Error(String(error)));
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

    const { message, title } = req.body as BroadcastBody;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Bad Request",
        message: "message is required and must be a non-empty string",
      });
    }

    const { sent } = await sendBroadcastToAllUsers({
      message: message.trim(),
      title: typeof title === "string" ? title.trim() || undefined : undefined,
      createdByUserId,
    });

    return res.status(201).json({
      sent,
      message: `Broadcast sent to ${sent} user(s).`,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /admin/broadcasts: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to send broadcast",
    });
  }
});

export default router;
