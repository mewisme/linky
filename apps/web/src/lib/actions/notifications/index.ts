'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/types/notifications.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getNotifications(params?: URLSearchParams): Promise<NotificationsResponse> {
  return serverFetch(backendUrl.notifications.me(params), { token: true });
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return serverFetch(backendUrl.notifications.unreadCount(), { token: true });
}

export async function markNotificationRead(id: string): Promise<void> {
  return serverFetch(backendUrl.notifications.readById(id), {
    method: 'PATCH',
    token: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  return serverFetch(backendUrl.notifications.readAll(), {
    method: 'PATCH',
    token: true,
  });
}
