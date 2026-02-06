import type {
  NotificationsResponse,
  UnreadCountResponse,
} from "@/types/notifications.types";

import { client } from "@/lib/client";

interface GetNotificationsParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export async function getNotifications(
  token: string,
  params: GetNotificationsParams = {}
): Promise<NotificationsResponse> {
  const { limit = 20, offset = 0, unreadOnly = false } = params;
  return client.get<NotificationsResponse>("/api/notifications/me", {
    params: {
      limit,
      offset,
      unread_only: unreadOnly,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getUnreadCount(
  token: string
): Promise<UnreadCountResponse> {
  return client.get<UnreadCountResponse>("/api/notifications/me/unread-count", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markNotificationRead(
  id: string,
  token: string
): Promise<void> {
  return client.patch<void>(`/api/notifications/${id}/read`, undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markAllNotificationsRead(
  token: string
): Promise<void> {
  return client.patch<void>("/api/notifications/read-all", undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
