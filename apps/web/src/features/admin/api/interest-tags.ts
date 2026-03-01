'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getAdminInterestTags(
  params?: URLSearchParams
): Promise<AdminAPI.InterestTags.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getAdminInterestTags",
    async (token) => serverFetch<AdminAPI.InterestTags.Get.Response>(
      backendUrl.admin.interestTags(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminInterestTags, key], tags: [cacheTags.adminInterestTags] },
  );
}

export async function createInterestTag(
  data: AdminAPI.InterestTags.Create.Body
): Promise<AdminAPI.InterestTags.Create.Response> {
  return withSentryAction("createInterestTag", async () => {
    const result = await serverFetch<AdminAPI.InterestTags.Create.Response>(
      backendUrl.admin.interestTags(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminInterestTags, 'max');
    return result;
  });
}

export async function updateInterestTag(
  id: string,
  data: AdminAPI.InterestTags.Update.Body
): Promise<AdminAPI.InterestTags.Update.Response> {
  return withSentryAction("updateInterestTag", async () => {
    const result = await serverFetch<AdminAPI.InterestTags.Update.Response>(
      backendUrl.admin.interestTagById(id),
      { method: 'PUT', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminInterestTags, 'max');
    return result;
  });
}

export async function deleteInterestTag(id: string): Promise<AdminAPI.InterestTags.Delete.Response> {
  return withSentryAction("deleteInterestTag", async () => {
    const result = await serverFetch<AdminAPI.InterestTags.Delete.Response>(
      backendUrl.admin.interestTagById(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminInterestTags, 'max');
    return result;
  });
}

export async function hardDeleteInterestTag(id: string): Promise<AdminAPI.InterestTags.HardDelete.Response> {
  return withSentryAction("hardDeleteInterestTag", async () => {
    const result = await serverFetch<AdminAPI.InterestTags.HardDelete.Response>(
      backendUrl.admin.interestTagHardDelete(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminInterestTags, 'max');
    return result;
  });
}

export async function importInterestTags(
  data: AdminAPI.InterestTags.Import.Body
): Promise<AdminAPI.InterestTags.Import.Response> {
  return withSentryAction("importInterestTags", async () => {
    const result = await serverFetch<AdminAPI.InterestTags.Import.Response>(
      backendUrl.admin.interestTagsImport(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminInterestTags, 'max');
    return result;
  });
}
