'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/types/notifications.types';

import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getNotifications(params?: URLSearchParams): Promise<NotificationsResponse> {
  return withSentryAction("getNotifications", async () => {
    return serverFetch(backendUrl.notifications.me(params), { token: true });
  });
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return withSentryAction("getUnreadCount", async () => {
    return serverFetch(backendUrl.notifications.unreadCount(), { token: true });
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  return withSentryAction("markNotificationRead", async () => {
    return serverFetch(backendUrl.notifications.readById(id), {
      method: 'PATCH',
      token: true,
    });
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  return withSentryAction("markAllNotificationsRead", async () => {
    return serverFetch(backendUrl.notifications.readAll(), {
      method: 'PATCH',
      token: true,
    });
  });
}
