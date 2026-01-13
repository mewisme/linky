import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { Webhook } from "svix";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import type { ClerkWebhookEvent } from "../types/webhook.js";
import { isUserCreatedEvent, isUserUpdatedEvent } from "../types/webhook.js";
import { supabase } from "../lib/supabase/client.js";

const router: ExpressRouter = Router();

router.post("/clerk", async (req: Request, res: Response) => {
  try {
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      logger.warn("Webhook request missing svix headers");
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
    } catch (err) {
      logger.error("Webhook verification failed: " + (err instanceof Error ? err.message : "Unknown error"));
      return res.status(400).json({
        error: "Bad Request",
        message: "Webhook verification failed",
      });
    }

    const eventType = evt.type;

    logger.info("Webhook event received: " + eventType);

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
            logger.error("Error creating user", {
              error: error.message,
            });
          }

          logger.info("Created user with email: " + evt.data.email_addresses[0]?.email_address);

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
            logger.error("Error updating user", {
              error: error.message,
            });
          }

          logger.info("Updated user with email: " + evt.data.email_addresses[0]?.email_address);
        }
        break;
      }

      default:
        logger.info("Unhandled webhook event type: " + eventType);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    logger.error("Error processing webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process webhook",
    });
  }
});

export default router;
