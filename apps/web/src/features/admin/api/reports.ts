'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminReports(
  params?: ServerActionQueryParams
): Promise<AdminAPI.Reports.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminReports",
    async () => serverFetch<AdminAPI.Reports.Get.Response>(backendUrl.admin.reports(searchParams)),
  );
}

export async function getAdminReport(id: string): Promise<AdminAPI.Reports.GetById.Response> {
  return withSentryQuery(
    "getAdminReport",
    async () => serverFetch<AdminAPI.Reports.GetById.Response>(backendUrl.admin.reportById(id)),
  );
}

export async function updateAdminReport(
  id: string,
  data: AdminAPI.Reports.Update.Body
): Promise<AdminAPI.Reports.Update.Response> {
  return withSentryAction("updateAdminReport", async () => {
    const result = await serverFetch<AdminAPI.Reports.Update.Response>(
      backendUrl.admin.reportById(id),
      { method: 'PATCH', body: JSON.stringify(data) }
    );
    revalidateTag(cacheTags.adminReports, 'max');
    return result;
  });
}

export async function generateAdminReportAiSummary(id: string): Promise<{ success: true }> {
  return withSentryAction("generateAdminReportAiSummary", async () => {
    const result = await serverFetch<{ success: true }>(
      `${backendUrl.admin.reportById(id)}/ai-summary:generate`,
      { method: 'POST' },
    );
    revalidateTag(cacheTags.adminReports, 'max');
    return result;
  });
}
