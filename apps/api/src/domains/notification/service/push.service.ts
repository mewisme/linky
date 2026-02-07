import type { PushOnlyOptions, PushSubscriptionRecord, WebPushSubscription } from "@/domains/notification/types/push.types.js";
import {
  createSubscription,
  deleteExpiredSubscription,
  deleteSubscription as deleteSubscriptionRepo,
  getUserSubscriptions,
} from "@/infra/supabase/repositories/push-subscriptions.js";

import type { NotificationRecord } from "@/domains/notification/types/notification.types.js";
import { createLogger } from "@repo/logger";
import { sendPushNotification } from "@/infra/push/web-push.client.js";

const logger = createLogger("api:notification:service:push");

export async function subscribe(userId: string, subscription: WebPushSubscription): Promise<PushSubscriptionRecord> {
  const record = await createSubscription({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });

  logger.info("User %s subscribed to push notifications", userId);

  return record;
}

export async function unsubscribe(userId: string, endpoint: string): Promise<boolean> {
  const result = await deleteSubscriptionRepo(userId, endpoint);

  logger.info("User %s unsubscribed from push notifications", userId);

  return result;
}

export async function sendPushToUser(userId: string, notification: NotificationRecord): Promise<void> {
  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      logger.debug("No push subscriptions found for user %s", userId);
      return;
    }

    const broadcastPayload = notification.payload as Record<string, unknown>;
    const title =
      notification.type === "admin_broadcast" && typeof broadcastPayload?.title === "string"
        ? broadcastPayload.title
        : getNotificationTitle(notification.type);

    const url =
      notification.type === "admin_broadcast" && typeof broadcastPayload?.url === "string"
        ? broadcastPayload.url
        : "/notifications";

    const payload = {
      notification: {
        title,
        body: getNotificationBody(notification),
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          url,
          notificationId: notification.id,
        },
      },
    };

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (error) {
        await handlePushError(error, sub.endpoint);
      }
    });

    await Promise.allSettled(sendPromises);

    logger.info("Push notifications sent to user %s (%d subscriptions)", userId, subscriptions.length);
  } catch (error) {
    logger.error("Error sending push to user %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function sendPushOnly(userId: string, options: PushOnlyOptions): Promise<void> {
  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      logger.debug("No push subscriptions found for user %s", userId);
      return;
    }

    const payload = {
      notification: {
        title: options.title,
        body: options.body,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          url: options.url ?? "/",
          ...options.data,
        },
      },
    };

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (error) {
        await handlePushError(error, sub.endpoint);
      }
    });

    await Promise.allSettled(sendPromises);

    logger.info("Push-only sent to user %s (%d subscriptions)", userId, subscriptions.length);
  } catch (error) {
    logger.error("Error sending push-only to user %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function handlePushError(error: unknown, endpoint: string): Promise<void> {
  if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 410) {
    logger.info("Subscription expired, deleting: %s", endpoint);
    await deleteExpiredSubscription(endpoint);
  } else {
    logger.error("Push notification error for endpoint %s: %o", endpoint, error instanceof Error ? error : new Error(String(error)));
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case "favorite_added":
      return "New Favorite";
    case "level_up":
      return "Level Up!";
    case "streak_milestone":
      return "Streak Milestone";
    case "streak_expiring":
      return "Streak Expiring Soon";
    case "admin_broadcast":
      return "Announcement";
    default:
      return "Notification";
  }
}

function getNotificationBody(notification: NotificationRecord): string {
  const payload = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case "favorite_added":
      return `${payload.from_user_name || "Someone"} added you as a favorite`;
    case "level_up":
      return `You reached level ${payload.new_level}!`;
    case "streak_milestone":
      return `${payload.days} day streak achieved!`;
    case "streak_expiring":
      return `Your streak expires in ${payload.expires_in_hours} hours`;
    case "admin_broadcast":
      return payload.message as string;
    default:
      return "You have a new notification";
  }
}
