import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import { createLogger } from "@repo/logger";
import { supabase } from "@/infra/supabase/client.js";

type NotificationInsert = TablesInsert<"notifications">;
type NotificationUpdate = TablesUpdate<"notifications">;

const logger = createLogger("infra:supabase:repositories:notifications");

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  is_read: boolean;
  created_at: string;
}

export interface GetUserNotificationsParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export async function createNotification(
  userId: string,
  type: string,
  payload: unknown
): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      payload: payload as Record<string, unknown>,
    } as NotificationInsert)
    .select()
    .single();

  if (error) {
    logger.error("Error creating notification: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data as NotificationRecord;
}

export async function getUserNotifications(
  userId: string,
  params: GetUserNotificationsParams = {}
): Promise<NotificationRecord[]> {
  const { limit = 20, offset = 0, unreadOnly = false } = params;

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching user notifications: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []) as NotificationRecord[];
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true } as NotificationUpdate)
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    logger.error("Error marking notification as read: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true } as NotificationUpdate)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logger.error("Error marking all notifications as read: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return true;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logger.error("Error getting unread count: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return count || 0;
}
