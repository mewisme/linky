'use server'

import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getBroadcasts(
  params?: ServerActionQueryParams
): Promise<AdminAPI.Broadcasts.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getBroadcasts",
    async () => serverFetch<AdminAPI.Broadcasts.Get.Response>(backendUrl.admin.broadcasts(searchParams)),
  );
}

export async function createBroadcast(
  data: AdminAPI.Broadcasts.Post.Body
): Promise<AdminAPI.Broadcasts.Post.Response> {
  return withSentryAction("createBroadcast", async () =>
    serverFetch<AdminAPI.Broadcasts.Post.Response>(
      backendUrl.admin.broadcasts(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function generateBroadcastAiDraft(
  data: AdminAPI.Broadcasts.AiGenerate.Body,
): Promise<AdminAPI.Broadcasts.AiGenerate.Response> {
  return withSentryAction("generateBroadcastAiDraft", async () => {
    return serverFetch<AdminAPI.Broadcasts.AiGenerate.Response>(
      backendUrl.admin.broadcastsAiGenerate(),
      { method: "POST", body: JSON.stringify(data) },
    )
  })
}
