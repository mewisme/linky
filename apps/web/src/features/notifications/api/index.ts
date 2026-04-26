'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/entities/notification/types/notifications.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getNotifications(
  params?: ServerActionQueryParams
): Promise<NotificationsResponse> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getNotifications",
    async () => serverFetch<NotificationsResponse>(backendUrl.notifications.me(searchParams)),
  );
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return withSentryQuery(
    "getUnreadCount",
    async () => serverFetch<UnreadCountResponse>(backendUrl.notifications.unreadCount()),
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  return withSentryAction("markNotificationRead", async () => {
    await serverFetch<void>(
      backendUrl.notifications.readById(id),
      { method: 'PATCH' }
    );
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  return withSentryAction("markAllNotificationsRead", async () => {
    await serverFetch<void>(
      backendUrl.notifications.readAll(),
      { method: 'PATCH' }
    );
  });
}
