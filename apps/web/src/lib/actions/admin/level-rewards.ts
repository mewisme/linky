'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getAdminLevelRewards(
  params?: URLSearchParams
): Promise<AdminAPI.LevelRewards.Get.Response> {
  return serverFetch(backendUrl.admin.levelRewards(params), { token: true });
}

export async function createLevelReward(
  data: AdminAPI.LevelRewards.Create.Body
): Promise<AdminAPI.LevelRewards.Create.Response> {
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
  return serverFetch(backendUrl.admin.levelRewardById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteLevelReward(id: string): Promise<AdminAPI.LevelRewards.Delete.Response> {
  return serverFetch(backendUrl.admin.levelRewardById(id), {
    method: 'DELETE',
    token: true,
  });
}
