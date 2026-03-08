'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminLevelRewards(
  params?: ServerActionQueryParams
): Promise<AdminAPI.LevelRewards.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminLevelRewards",
    async (token) => serverFetch<AdminAPI.LevelRewards.Get.Response>(
      backendUrl.admin.levelRewards(searchParams), { preloadedToken: token }
    ),
  );
}

export async function createLevelReward(
  data: AdminAPI.LevelRewards.Create.Body
): Promise<AdminAPI.LevelRewards.Create.Response> {
  return withSentryAction("createLevelReward", async () => {
    const result = await serverFetch<AdminAPI.LevelRewards.Create.Response>(
      backendUrl.admin.levelRewards(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminLevelRewards, 'max');
    return result;
  });
}

export async function updateLevelReward(
  id: string,
  data: AdminAPI.LevelRewards.Update.Body
): Promise<AdminAPI.LevelRewards.Update.Response> {
  return withSentryAction("updateLevelReward", async () => {
    const result = await serverFetch<AdminAPI.LevelRewards.Update.Response>(
      backendUrl.admin.levelRewardById(id),
      { method: 'PUT', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminLevelRewards, 'max');
    return result;
  });
}

export async function deleteLevelReward(id: string): Promise<AdminAPI.LevelRewards.Delete.Response> {
  return withSentryAction("deleteLevelReward", async () => {
    const result = await serverFetch<AdminAPI.LevelRewards.Delete.Response>(
      backendUrl.admin.levelRewardById(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminLevelRewards, 'max');
    return result;
  });
}
