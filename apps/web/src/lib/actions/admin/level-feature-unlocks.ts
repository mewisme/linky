'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminLevelFeatureUnlocks(
  params?: URLSearchParams
): Promise<AdminAPI.LevelFeatureUnlocks.Get.Response> {
  return withSentryAction("getAdminLevelFeatureUnlocks", async () => {
    return serverFetch(backendUrl.admin.levelFeatureUnlocks(params), { token: true });
  });
}

export async function createLevelFeatureUnlock(
  data: AdminAPI.LevelFeatureUnlocks.Create.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Create.Response> {
  return withSentryAction("createLevelFeatureUnlock", async () => {
    return serverFetch(backendUrl.admin.levelFeatureUnlocks(), {
      method: 'POST',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function updateLevelFeatureUnlock(
  id: string,
  data: AdminAPI.LevelFeatureUnlocks.Update.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Update.Response> {
  return withSentryAction("updateLevelFeatureUnlock", async () => {
    return serverFetch(backendUrl.admin.levelFeatureUnlockById(id), {
      method: 'PUT',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function deleteLevelFeatureUnlock(id: string): Promise<AdminAPI.LevelFeatureUnlocks.Delete.Response> {
  return withSentryAction("deleteLevelFeatureUnlock", async () => {
    return serverFetch(backendUrl.admin.levelFeatureUnlockById(id), {
      method: 'DELETE',
      token: true,
    });
  });
}
