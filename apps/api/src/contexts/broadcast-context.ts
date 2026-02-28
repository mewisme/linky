import { createBroadcastHistory } from "@/infra/supabase/repositories/broadcast-history.js";
import { createLogger } from "@/utils/logger.js";
import { createNotification } from "@/domains/notification/service/notification.service.js";
import { getActiveUserIds } from "@/infra/supabase/repositories/users.js";
import { sendPushOnly } from "@/domains/notification/service/push.service.js";

const logger = createLogger("context:broadcast");

export interface SendBroadcastParams {
  message: string;
  title?: string;
  createdByUserId: string;
  deliveryMode?: "push_only" | "push_and_save";
  url?: string;
}

export async function sendBroadcastToAllUsers(params: SendBroadcastParams): Promise<{ sent: number }> {
  const deliveryMode = params.deliveryMode ?? "push_and_save";
  const userIds = await getActiveUserIds();

  let sent = 0;

  if (deliveryMode === "push_only") {
    const title = params.title?.trim() || "Announcement";
    const url = params.url ?? "/notifications";
    for (const userId of userIds) {
      try {
        await sendPushOnly(userId, {
          title,
          body: params.message,
          url,
        });
        sent++;
      } catch (error) {
        logger.warn(error as Error, "Failed to send push-only broadcast to user %s", userId);
      }
    }

    logger.info("Push-only broadcast sent to %d of %d users", sent, userIds.length);
    return { sent };
  }

  await createBroadcastHistory({
    created_by_user_id: params.createdByUserId,
    title: params.title ?? null,
    message: params.message,
  });

  for (const userId of userIds) {
    try {
      await createNotification(userId, "admin_broadcast", {
        message: params.message,
        title: params.title,
        url: params.url,
      });
      sent++;
    } catch (error) {
      logger.warn(error as Error, "Failed to send broadcast to user %s", userId);
    }
  }

  logger.info("Broadcast sent to %d of %d users", sent, userIds.length);

  return { sent };
}
