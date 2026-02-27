'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getAdminLevelRewards(
  params?: URLSearchParams
): Promise<AdminAPI.LevelRewards.Get.Response> {
  trackEventServer({ name: 'api_admin_level_rewards_get' });
  return serverFetch(backendUrl.admin.levelRewards(params), { token: true });
}

export async function createLevelReward(
  data: AdminAPI.LevelRewards.Create.Body
): Promise<AdminAPI.LevelRewards.Create.Response> {
  trackEventServer({ name: 'api_admin_level_rewards_post' });
  return serverFetch(backendUrl.admin.levelRewards(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function updateLevelReward(
  id: string,
  data: AdminAPI.LevelRewards.Update.Body
): Promise<AdminAPI.LevelRewards.Update.Response> {
  trackEventServer({ name: 'api_admin_level_rewards_id_put', properties: { id } });
  return serverFetch(backendUrl.admin.levelRewardById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteLevelReward(id: string): Promise<AdminAPI.LevelRewards.Delete.Response> {
  trackEventServer({ name: 'api_admin_level_rewards_id_delete', properties: { id } });
  return serverFetch(backendUrl.admin.levelRewardById(id), {
    method: 'DELETE',
    token: true,
  });
}
