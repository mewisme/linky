'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function createReport(
  data: ResourcesAPI.Reports.Create.Body
): Promise<ResourcesAPI.Reports.Create.Response> {
  return withSentryAction("createReport", async () => {
    trackEventServer({ name: 'api_resources_reports_post' });
    return serverFetch(backendUrl.resources.reports(), {
      method: 'POST',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function getMyReports(
  params?: ResourcesAPI.Reports.GetMe.QueryParams
): Promise<ResourcesAPI.Reports.GetMe.Response> {
  return withSentryAction("getMyReports", async () => {
    trackEventServer({ name: 'api_resources_reports_me_get' });
    const query = params ? new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ) : undefined;
    return serverFetch(backendUrl.resources.reportsMe(query), { token: true });
  });
}
