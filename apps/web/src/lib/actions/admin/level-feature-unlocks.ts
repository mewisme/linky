'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getAdminLevelFeatureUnlocks(
  params?: URLSearchParams
): Promise<AdminAPI.LevelFeatureUnlocks.Get.Response> {
  trackEventServer({ name: 'api_admin_level_feature_unlocks_get' });
  return serverFetch(backendUrl.admin.levelFeatureUnlocks(params), { token: true });
}

export async function createLevelFeatureUnlock(
  data: AdminAPI.LevelFeatureUnlocks.Create.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Create.Response> {
  trackEventServer({ name: 'api_admin_level_feature_unlocks_post' });
  return serverFetch(backendUrl.admin.levelFeatureUnlocks(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function updateLevelFeatureUnlock(
  id: string,
  data: AdminAPI.LevelFeatureUnlocks.Update.Body
): Promise<AdminAPI.LevelFeatureUnlocks.Update.Response> {
  trackEventServer({ name: 'api_admin_level_feature_unlocks_id_put', properties: { id } });
  return serverFetch(backendUrl.admin.levelFeatureUnlockById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteLevelFeatureUnlock(id: string): Promise<AdminAPI.LevelFeatureUnlocks.Delete.Response> {
  trackEventServer({ name: 'api_admin_level_feature_unlocks_id_delete', properties: { id } });
  return serverFetch(backendUrl.admin.levelFeatureUnlockById(id), {
    method: 'DELETE',
    token: true,
  });
}
