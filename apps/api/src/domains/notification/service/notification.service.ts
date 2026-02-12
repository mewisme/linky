import { createLogger } from "@ws/logger";
import {
  createNotification as createNotificationRepo,
  getUserNotifications as getUserNotificationsRepo,
  markNotificationRead as markNotificationReadRepo,
  markAllNotificationsRead as markAllNotificationsReadRepo,
  getUnreadCount as getUnreadCountRepo,
  type GetUserNotificationsParams,
} from "@/infra/supabase/repositories/notifications.js";
import { sendPushToUser } from "./push.service.js";
import type { NotificationRecord } from "@/domains/notification/types/notification.types.js";

const logger = createLogger("api:notification:service:notification");

let notificationContext: NotificationContext | null = null;

export interface NotificationContext {
  io: unknown;
  getSocketByUserId?: (userId: string) => unknown;
}

export function setNotificationContext(context: NotificationContext): void {
  notificationContext = context;
}

export function getNotificationContext(): NotificationContext | null {
  return notificationContext;
}

export async function createNotification(
  userId: string,
  type: string,
  payload: unknown
): Promise<NotificationRecord> {
  const notification = await createNotificationRepo(userId, type, payload);

  const delivered = await tryDeliverViaSocket(userId, notification);

  if (!delivered) {
    logger.info("User %s not online, attempting push notification", userId);
    try {
      await sendPushToUser(userId, notification);
    } catch (error) {
      logger.warn("Failed to send push notification to user %s: %o", userId, error as Error);
    }
  }

  logger.info("Notification created for user %s (type: %s)", userId, type);

  return notification;
}

export async function markRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await markNotificationReadRepo(notificationId, userId);

  await tryEmitToSocket(userId, "notification:read", { notificationId });

  logger.info("Notification %s marked as read", notificationId);

  return result;
}

export async function markAllRead(userId: string): Promise<boolean> {
  const result = await markAllNotificationsReadRepo(userId);

  await tryEmitToSocket(userId, "notification:all-read", {});

  logger.info("All notifications marked as read for user %s", userId);

  return result;
}

export async function getUserNotifications(
  userId: string,
  params: GetUserNotificationsParams = {}
): Promise<NotificationRecord[]> {
  return getUserNotificationsRepo(userId, params);
}

export async function getUnreadCount(userId: string): Promise<number> {
  return getUnreadCountRepo(userId);
}

async function tryDeliverViaSocket(userId: string, notification: NotificationRecord): Promise<boolean> {
  if (!notificationContext?.getSocketByUserId) {
    return false;
  }

  try {
    const socket = notificationContext.getSocketByUserId(userId) as { connected: boolean; emit: (event: string, data: unknown) => void } | null;

    if (socket && socket.connected) {
      socket.emit("notification:new", notification);
      logger.info("Notification delivered via socket to user %s", userId);
      return true;
    }
  } catch (error) {
    logger.error("Error delivering notification via socket: %o", error as Error);
  }

  return false;
}

async function tryEmitToSocket(userId: string, event: string, data: unknown): Promise<void> {
  if (!notificationContext?.getSocketByUserId) {
    return;
  }

  try {
    const socket = notificationContext.getSocketByUserId(userId) as { connected: boolean; emit: (event: string, data: unknown) => void } | null;

    if (socket && socket.connected) {
      socket.emit(event, data);
      logger.info("Event %s emitted to user %s", event, userId);
    }
  } catch (error) {
    logger.error("Error emitting to socket: %o", error as Error);
  }
}
