import type {
  NotificationsResponse,
  UnreadCountResponse,
} from "@/types/notifications.types";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData, patchData } from "@/lib/api/fetch/client-api";

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
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    unread_only: String(unreadOnly),
  });
  return fetchData<NotificationsResponse>(apiUrl.notifications.me(searchParams), { token });
}

export async function getUnreadCount(
  token: string
): Promise<UnreadCountResponse> {
  return fetchData<UnreadCountResponse>(apiUrl.notifications.unreadCount(), { token });
}

export async function markNotificationRead(
  id: string,
  token: string
): Promise<void> {
  return patchData<void>(apiUrl.notifications.readById(id), { token });
}

export async function markAllNotificationsRead(
  token: string
): Promise<void> {
  return patchData<void>(apiUrl.notifications.readAll(), { token });
}
