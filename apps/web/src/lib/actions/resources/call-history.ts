'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/sentry/with-action';

function buildQuery(params?: ResourcesAPI.CallHistory.Get.QueryParams): URLSearchParams | undefined {
  if (!params) return undefined;
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  );
}

export async function getCallHistory(
  params?: ResourcesAPI.CallHistory.Get.QueryParams
): Promise<ResourcesAPI.CallHistory.Get.Response> {
  const key = buildQuery(params)?.toString() ?? '';
  return withSentryQuery(
    "getCallHistory",
    async (token) => serverFetch<ResourcesAPI.CallHistory.Get.Response>(
      backendUrl.resources.callHistory(buildQuery(params)), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.callHistory, key], tags: [cacheTags.callHistory] },
  );
}

export async function getCallHistoryById(
  id: string
): Promise<ResourcesAPI.CallHistory.GetById.Response> {
  return withSentryQuery(
    "getCallHistoryById",
    async (token) => serverFetch<ResourcesAPI.CallHistory.GetById.Response>(
      backendUrl.resources.callHistoryById(id), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.callHistory, id], tags: [cacheTags.callHistory] },
  );
}
