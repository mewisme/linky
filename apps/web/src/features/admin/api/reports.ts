'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getAdminReports(
  params?: URLSearchParams
): Promise<AdminAPI.Reports.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getAdminReports",
    async (token) => serverFetch<AdminAPI.Reports.Get.Response>(
      backendUrl.admin.reports(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminReports, key], tags: [cacheTags.adminReports] },
  );
}

export async function getAdminReport(id: string): Promise<AdminAPI.Reports.GetById.Response> {
  return withSentryQuery(
    "getAdminReport",
    async (token) => serverFetch<AdminAPI.Reports.GetById.Response>(
      backendUrl.admin.reportById(id), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminReports, id], tags: [cacheTags.adminReports] },
  );
}

export async function updateAdminReport(
  id: string,
  data: AdminAPI.Reports.Update.Body
): Promise<AdminAPI.Reports.Update.Response> {
  return withSentryAction("updateAdminReport", async () => {
    const result = await serverFetch<AdminAPI.Reports.Update.Response>(
      backendUrl.admin.reportById(id),
      { method: 'PATCH', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminReports, 'max');
    return result;
  });
}
