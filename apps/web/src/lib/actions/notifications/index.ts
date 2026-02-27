'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/types/notifications.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getNotifications(params?: URLSearchParams): Promise<NotificationsResponse> {
  trackEventServer({ name: 'api_notifications_me_get' });
  return serverFetch(backendUrl.notifications.me(params), { token: true });
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  trackEventServer({ name: 'api_notifications_me_unread_count_get' });
  return serverFetch(backendUrl.notifications.unreadCount(), { token: true });
}

export async function markNotificationRead(id: string): Promise<void> {
  trackEventServer({ name: 'api_notifications_id_read_patch', properties: { id } });
  return serverFetch(backendUrl.notifications.readById(id), {
    method: 'PATCH',
    token: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  trackEventServer({ name: 'api_notifications_read_all_patch' });
  return serverFetch(backendUrl.notifications.readAll(), {
    method: 'PATCH',
    token: true,
  });
}
