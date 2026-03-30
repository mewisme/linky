import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Webhook } from "svix";
import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { ClerkWebhookEvent } from "@/types/webhook/webhook.types.js";
import { processClerkWebhookDelivery } from "@/contexts/clerk-webhook-context.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:webhook");

router.post("/clerk", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.warn(
        "Webhook request missing svix headers: %s, %s, %s",
        svixId,
        svixTimestamp,
        svixSignature || "undefined",
      );
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing svix headers",
      });
    }

    const payload = req.body instanceof Buffer ? req.body.toString() : String(req.body);

    const wh = new Webhook(config.clerkWebhookSecret);

    let evt: ClerkWebhookEvent;
    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err: unknown) {
      logger.error(toLoggableError(err), "Webhook verification failed");
      return res.status(400).json({
        error: "Bad Request",
        message: "Webhook verification failed",
      });
    }

    await processClerkWebhookDelivery(svixId, evt);

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error processing webhook");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process webhook",
    });
  }
});

export default router;
