'use server'

import type { AdminAPI } from '@/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function getAdminLevelFeatureUnlocks(
  params?: URLSearchParams
): Promise<AdminAPI.LevelFeatureUnlocks.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getAdminLevelFeatureUnlocks",
    async (token) => serverFetch<AdminAPI.LevelFeatureUnlocks.Get.Response>(
      backendUrl.admin.levelFeatureUnlocks(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminLevelFeatureUnlocks, key], tags: [cacheTags.adminLevelFeatureUnlocks] },
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
