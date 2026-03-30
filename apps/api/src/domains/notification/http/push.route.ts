import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { subscribe, unsubscribe } from "@/domains/notification/service/push.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { config } from "@/config/index.js";
import type { SubscribeBody, UnsubscribeBody } from "@/domains/notification/types/push.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:notification:push:route");

router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const { subscription } = req.body as SubscribeBody;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Valid subscription object is required",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const record = await subscribe(userId, subscription);

    return res.status(201).json(record);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /push/subscribe");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to subscribe to push notifications",
    });
  }
});

router.delete("/unsubscribe", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const { endpoint } = req.body as UnsubscribeBody;

    if (!endpoint) {
      return res.status(400).json({
        error: "Bad Request",
        message: "endpoint is required",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    await unsubscribe(userId, endpoint);

    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /push/unsubscribe");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to unsubscribe from push notifications",
    });
  }
});

router.get("/vapid-public-key", (_req: Request, res: Response) => {
  try {
    if (!config.vapidPublicKey) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Push notifications are not configured",
      });
    }

    return res.json({ publicKey: config.vapidPublicKey });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /push/vapid-public-key");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch VAPID public key",
    });
  }
});

export default router;
