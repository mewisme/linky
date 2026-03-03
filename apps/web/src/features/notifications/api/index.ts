'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/entities/notification/types/notifications.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getNotifications(
  params?: ServerActionQueryParams
): Promise<NotificationsResponse> {
  const searchParams = toURLSearchParams(params);
  const key = searchParams?.toString() ?? '';
  return withSentryQuery(
    "getNotifications",
    async (token) => serverFetch<NotificationsResponse>(
      backendUrl.notifications.me(searchParams), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.notifications, key], tags: [cacheTags.notifications] },
  );
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return withSentryQuery(
    "getUnreadCount",
    async (token) => serverFetch<UnreadCountResponse>(
      backendUrl.notifications.unreadCount(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.notifications, 'unread'], tags: [cacheTags.notifications] },
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  return withSentryAction("markNotificationRead", async () => {
    await serverFetch<void>(
      backendUrl.notifications.readById(id),
      { method: 'PATCH', token: true }
    );
    revalidateTag(cacheTags.notifications, 'max');
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  return withSentryAction("markAllNotificationsRead", async () => {
    await serverFetch<void>(
      backendUrl.notifications.readAll(),
      { method: 'PATCH', token: true }
    );
    revalidateTag(cacheTags.notifications, 'max');
  });
}
