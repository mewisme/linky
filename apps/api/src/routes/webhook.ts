import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Webhook } from "svix";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger/api";
import type { ClerkWebhookEvent } from "../types/webhook/webhook.types.js";
import { isUserCreatedEvent, isUserUpdatedEvent } from "../types/webhook/webhook.types.js";
import { supabase } from "../infra/supabase/client.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:Webhook:Route");

router.post("/clerk", async (req: Request, res: Response) => {
  try {
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.warn("Webhook request missing svix headers: %s, %s, %s", svixId, svixTimestamp, svixSignature || "undefined");
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
      logger.error("Webhook verification failed: %o", err instanceof Error ? err : new Error(String(err)));
      return res.status(400).json({
        error: "Bad Request",
        message: "Webhook verification failed",
      });
    }

    const eventType = evt.type;

    logger.info("Webhook event received: %s", eventType);

    switch (eventType) {
      case "user.created": {
        if (isUserCreatedEvent(evt)) {
          const { error } = await supabase.from("users").insert({
            clerk_user_id: evt.data.id,
            email: evt.data.email_addresses[0]?.email_address ?? null,
            first_name: evt.data.first_name ?? null,
            last_name: evt.data.last_name ?? null,
            avatar_url: evt.data.image_url ?? null,
          });

          if (error) {
            logger.error("Error creating user: %o", error);
          }

          logger.info("Created user with email: %s", evt.data.email_addresses[0]?.email_address);

          break;
        }
        break;
      }

      case "user.updated": {
        if (isUserUpdatedEvent(evt)) {
          const { error } = await supabase.from("users").update({
            email: evt.data.email_addresses[0]?.email_address ?? null,
            first_name: evt.data.first_name ?? null,
            last_name: evt.data.last_name ?? null,
            avatar_url: evt.data.image_url ?? null,
          }).eq("clerk_user_id", evt.data.id);

          if (error) {
            logger.error("Error updating user: %o", error);
          }

          logger.info("Updated user with email: %s", evt.data.email_addresses[0]?.email_address);
        }
        break;
      }

      default:
        logger.info("Unhandled webhook event type: %s", eventType);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error: unknown) {
    logger.error("Error processing webhook: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process webhook",
    });
  }
});

export default router;
