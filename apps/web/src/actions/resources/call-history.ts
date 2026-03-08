'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/monitoring/with-action';

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
  return withSentryQuery(
    "getCallHistory",
    async () => serverFetch<ResourcesAPI.CallHistory.Get.Response>(backendUrl.resources.callHistory(buildQuery(params))),
  );
}

export async function getCallHistoryById(
  id: string
): Promise<ResourcesAPI.CallHistory.GetById.Response> {
  return withSentryQuery(
    "getCallHistoryById",
    async () => serverFetch<ResourcesAPI.CallHistory.GetById.Response>(backendUrl.resources.callHistoryById(id)),
  );
}
