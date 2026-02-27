'use server'

import type { NotificationsResponse, UnreadCountResponse } from '@/types/notifications.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function getNotifications(
  params?: URLSearchParams
): Promise<NotificationsResponse> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getNotifications",
    async (token) => serverFetch<NotificationsResponse>(
      backendUrl.notifications.me(params), { preloadedToken: token }
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
