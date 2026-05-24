'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminVideoFilterPresets(
  params?: ServerActionQueryParams
): Promise<AdminAPI.VideoFilterPresets.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminVideoFilterPresets",
    async () => serverFetch<AdminAPI.VideoFilterPresets.Get.Response>(backendUrl.admin.videoFilterPresets(searchParams)),
  );
}

export async function createVideoFilterPreset(
  data: AdminAPI.VideoFilterPresets.Create.Body
): Promise<AdminAPI.VideoFilterPresets.Create.Response> {
  return withSentryAction("createVideoFilterPreset", async () =>
    serverFetch<AdminAPI.VideoFilterPresets.Create.Response>(
      backendUrl.admin.videoFilterPresets(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function updateVideoFilterPreset(
  id: string,
  data: AdminAPI.VideoFilterPresets.Update.Body
): Promise<AdminAPI.VideoFilterPresets.Update.Response> {
  return withSentryAction("updateVideoFilterPreset", async () =>
    serverFetch<AdminAPI.VideoFilterPresets.Update.Response>(
      backendUrl.admin.videoFilterPresetById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function deleteVideoFilterPreset(id: string): Promise<AdminAPI.VideoFilterPresets.Delete.Response> {
  return withSentryAction("deleteVideoFilterPreset", async () =>
    serverFetch<AdminAPI.VideoFilterPresets.Delete.Response>(
      backendUrl.admin.videoFilterPresetById(id),
      { method: 'DELETE' }
    ));
}
