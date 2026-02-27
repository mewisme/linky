'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getCallHistory(
  params?: ResourcesAPI.CallHistory.Get.QueryParams
): Promise<ResourcesAPI.CallHistory.Get.Response> {
  const query = params ? new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  ) : undefined;
  return serverFetch(backendUrl.resources.callHistory(query), { token: true });
}

export async function getCallHistoryById(id: string): Promise<ResourcesAPI.CallHistory.GetById.Response> {
  return serverFetch(backendUrl.resources.callHistoryById(id), { token: true });
}
