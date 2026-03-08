'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminLevelFeatureUnlocks(
  params?: ServerActionQueryParams
): Promise<AdminAPI.LevelFeatureUnlocks.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminLevelFeatureUnlocks",
    async (token) => serverFetch<AdminAPI.LevelFeatureUnlocks.Get.Response>(
      backendUrl.admin.levelFeatureUnlocks(searchParams), { preloadedToken: token }
    ),
  );
}

export async function createLevelFeatureUnlock(
  data: AdminAPI.LevelFeatureUnlocks.Create.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Create.Response> {
  return withSentryAction("createLevelFeatureUnlock", async () => {
    const result = await serverFetch<AdminAPI.LevelFeatureUnlocks.Create.Response>(
      backendUrl.admin.levelFeatureUnlocks(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminLevelFeatureUnlocks, 'max');
    return result;
  });
}

export async function updateLevelFeatureUnlock(
  id: string,
  data: AdminAPI.LevelFeatureUnlocks.Update.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Update.Response> {
  return withSentryAction("updateLevelFeatureUnlock", async () => {
    const result = await serverFetch<AdminAPI.LevelFeatureUnlocks.Update.Response>(
      backendUrl.admin.levelFeatureUnlockById(id),
      { method: 'PUT', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminLevelFeatureUnlocks, 'max');
    return result;
  });
}

export async function deleteLevelFeatureUnlock(id: string): Promise<AdminAPI.LevelFeatureUnlocks.Delete.Response> {
  return withSentryAction("deleteLevelFeatureUnlock", async () => {
    const result = await serverFetch<AdminAPI.LevelFeatureUnlocks.Delete.Response>(
      backendUrl.admin.levelFeatureUnlockById(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminLevelFeatureUnlocks, 'max');
    return result;
  });
}
