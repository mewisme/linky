'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function createReport(
  data: ResourcesAPI.Reports.Create.Body
): Promise<ResourcesAPI.Reports.Create.Response> {
  return withSentryAction("createReport", async () => {
    const result = await serverFetch<ResourcesAPI.Reports.Create.Response>(
      backendUrl.resources.reports(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.reportsMe, 'max');
    return result;
  });
}

export async function getMyReports(
  params?: ResourcesAPI.Reports.GetMe.QueryParams
): Promise<ResourcesAPI.Reports.GetMe.Response> {
  const query = params
    ? new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      )
    : undefined;
  return withSentryQuery(
    "getMyReports",
    async (token) => serverFetch<ResourcesAPI.Reports.GetMe.Response>(
      backendUrl.resources.reportsMe(query), { preloadedToken: token }
    ),
  );
}
