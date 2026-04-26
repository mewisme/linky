'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminInterestTags(
  params?: ServerActionQueryParams
): Promise<AdminAPI.InterestTags.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminInterestTags",
    async () => serverFetch<AdminAPI.InterestTags.Get.Response>(backendUrl.admin.interestTags(searchParams)),
  );
}

export async function createInterestTag(
  data: AdminAPI.InterestTags.Create.Body
): Promise<AdminAPI.InterestTags.Create.Response> {
  return withSentryAction("createInterestTag", async () =>
    serverFetch<AdminAPI.InterestTags.Create.Response>(
      backendUrl.admin.interestTags(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function updateInterestTag(
  id: string,
  data: AdminAPI.InterestTags.Update.Body
): Promise<AdminAPI.InterestTags.Update.Response> {
  return withSentryAction("updateInterestTag", async () =>
    serverFetch<AdminAPI.InterestTags.Update.Response>(
      backendUrl.admin.interestTagById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function deleteInterestTag(id: string): Promise<AdminAPI.InterestTags.Delete.Response> {
  return withSentryAction("deleteInterestTag", async () =>
    serverFetch<AdminAPI.InterestTags.Delete.Response>(
      backendUrl.admin.interestTagById(id),
      { method: 'DELETE' }
    ));
}

export async function hardDeleteInterestTag(id: string): Promise<AdminAPI.InterestTags.HardDelete.Response> {
  return withSentryAction("hardDeleteInterestTag", async () =>
    serverFetch<AdminAPI.InterestTags.HardDelete.Response>(
      backendUrl.admin.interestTagHardDelete(id),
      { method: 'DELETE' }
    ));
}

export async function importInterestTags(
  data: AdminAPI.InterestTags.Import.Body
): Promise<AdminAPI.InterestTags.Import.Response> {
  return withSentryAction("importInterestTags", async () =>
    serverFetch<AdminAPI.InterestTags.Import.Response>(
      backendUrl.admin.interestTagsImport(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}
