import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Webhook } from "svix";
import { config } from "@/config/index.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { ClerkWebhookEvent } from "@/types/webhook/webhook.types.js";
import { processClerkWebhookDelivery } from "@/contexts/clerk-webhook-context.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";

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
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("MISSING_SVIX", "missingSvixHeaders", "Missing svix headers"),
      );
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
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("WEBHOOK_VERIFY_FAILED", "webhookVerificationFailed", "Webhook verification failed"),
      );
    }

    await processClerkWebhookDelivery(svixId, evt);

    return res.status(200).json({
      success: true,
      ...userFacingPayload(toUserMessage("WEBHOOK_OK", { key: "api.webhookProcessed" }, "Webhook processed")),
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Error processing webhook");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_PROCESS_WEBHOOK", "failedProcessWebhook", "Failed to process webhook"),
    );
  }
});

export default router;
