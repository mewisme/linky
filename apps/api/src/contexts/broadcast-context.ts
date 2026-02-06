import { createBroadcastHistory } from "@/infra/supabase/repositories/broadcast-history.js";
import { createLogger } from "@repo/logger";
import { createNotification } from "@/domains/notification/service/notification.service.js";
import { getActiveUserIds } from "@/infra/supabase/repositories/users.js";

const logger = createLogger("context:broadcast");

export interface SendBroadcastParams {
  message: string;
  title?: string;
  createdByUserId: string;
}

export async function sendBroadcastToAllUsers(params: SendBroadcastParams): Promise<{ sent: number }> {
  await createBroadcastHistory({
    created_by_user_id: params.createdByUserId,
    title: params.title ?? null,
    message: params.message,
  });

  const userIds = await getActiveUserIds();

  let sent = 0;
  for (const userId of userIds) {
    try {
      await createNotification(userId, "admin_broadcast", {
        message: params.message,
        title: params.title,
      });
      sent++;
    } catch (error) {
      logger.warn("Failed to send broadcast to user %s: %o", userId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  logger.info("Broadcast sent to %d of %d users", sent, userIds.length);

  return { sent };
}
