'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminLevelRewards(
  params?: ServerActionQueryParams
): Promise<AdminAPI.LevelRewards.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminLevelRewards",
    async () => serverFetch<AdminAPI.LevelRewards.Get.Response>(backendUrl.admin.levelRewards(searchParams)),
  );
}

export async function createLevelReward(
  data: AdminAPI.LevelRewards.Create.Body
): Promise<AdminAPI.LevelRewards.Create.Response> {
  return withSentryAction("createLevelReward", async () =>
    serverFetch<AdminAPI.LevelRewards.Create.Response>(
      backendUrl.admin.levelRewards(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function updateLevelReward(
  id: string,
  data: AdminAPI.LevelRewards.Update.Body
): Promise<AdminAPI.LevelRewards.Update.Response> {
  return withSentryAction("updateLevelReward", async () =>
    serverFetch<AdminAPI.LevelRewards.Update.Response>(
      backendUrl.admin.levelRewardById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function deleteLevelReward(id: string): Promise<AdminAPI.LevelRewards.Delete.Response> {
  return withSentryAction("deleteLevelReward", async () =>
    serverFetch<AdminAPI.LevelRewards.Delete.Response>(
      backendUrl.admin.levelRewardById(id),
      { method: 'DELETE' }
    ));
}
