import { config } from "@/config/index.js";
import { createLogger } from "@repo/logger";
import webpush from "web-push";

const logger = createLogger("infra:push:web-push");

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function initializeWebPush(): void {
  if (!config.vapidPublicKey || !config.vapidPrivateKey || !config.vapidSubject) {
    logger.warn("VAPID credentials not configured. Web push notifications will not work.");
    return;
  }

  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );

  logger.info("Web push initialized with VAPID details");
}

export async function sendPushNotification(
  subscription: WebPushSubscription,
  payload: unknown
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
      {
        urgency: "high",
        TTL: 60,
      }
    );

    logger.info("Push notification sent successfully to %s", subscription.endpoint);
  } catch (error) {
    logger.error("Error sending push notification: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export { webpush };
