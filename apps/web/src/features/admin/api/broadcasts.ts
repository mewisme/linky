'use server'

import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { cacheTags } from '@/lib/cache/tags';
import { revalidateTag } from 'next/cache';
import { serverFetch } from '@/lib/http/server-api';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getBroadcasts(
  params?: ServerActionQueryParams
): Promise<AdminAPI.Broadcasts.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getBroadcasts",
    async (token) => serverFetch<AdminAPI.Broadcasts.Get.Response>(
      backendUrl.admin.broadcasts(searchParams), { preloadedToken: token }
    ),
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
