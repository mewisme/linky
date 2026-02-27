'use server'

import type { AdminAPI } from '@/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function getBroadcasts(
  params?: URLSearchParams
): Promise<AdminAPI.Broadcasts.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getBroadcasts",
    async (token) => serverFetch<AdminAPI.Broadcasts.Get.Response>(
      backendUrl.admin.broadcasts(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminBroadcasts, key], tags: [cacheTags.adminBroadcasts] },
  );
}

export async function createBroadcast(
  data: AdminAPI.Broadcasts.Post.Body
): Promise<AdminAPI.Broadcasts.Post.Response> {
  return withSentryAction("createBroadcast", async () => {
    const result = await serverFetch<AdminAPI.Broadcasts.Post.Response>(
      backendUrl.admin.broadcasts(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminBroadcasts, 'max');
    return result;
  });
}
