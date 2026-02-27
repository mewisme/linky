'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminReports(
  params?: URLSearchParams
): Promise<AdminAPI.Reports.Get.Response> {
  return withSentryAction("getAdminReports", async () => {
    return serverFetch(backendUrl.admin.reports(params), { token: true });
  });
}

export async function getAdminReport(id: string): Promise<AdminAPI.Reports.GetById.Response> {
  return withSentryAction("getAdminReport", async () => {
    return serverFetch(backendUrl.admin.reportById(id), { token: true });
  });
}

export async function updateAdminReport(
  id: string,
  data: AdminAPI.Reports.Update.Body
): Promise<AdminAPI.Reports.Update.Response> {
  return withSentryAction("updateAdminReport", async () => {
    return serverFetch(backendUrl.admin.reportById(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
      token: true,
    });
  });
}
