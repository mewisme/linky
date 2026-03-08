'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminStreakExpBonuses(
  params?: ServerActionQueryParams
): Promise<AdminAPI.StreakExpBonuses.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminStreakExpBonuses",
    async (token) => serverFetch<AdminAPI.StreakExpBonuses.Get.Response>(
      backendUrl.admin.streakExpBonuses(searchParams), { preloadedToken: token }
    ),
  );
}

export async function createStreakExpBonus(
  data: AdminAPI.StreakExpBonuses.Create.Body
): Promise<AdminAPI.StreakExpBonuses.Create.Response> {
  return withSentryAction("createStreakExpBonus", async () => {
    const result = await serverFetch<AdminAPI.StreakExpBonuses.Create.Response>(
      backendUrl.admin.streakExpBonuses(),
      { method: 'POST', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminStreakExpBonuses, 'max');
    return result;
  });
}

export async function updateStreakExpBonus(
  id: string,
  data: AdminAPI.StreakExpBonuses.Update.Body
): Promise<AdminAPI.StreakExpBonuses.Update.Response> {
  return withSentryAction("updateStreakExpBonus", async () => {
    const result = await serverFetch<AdminAPI.StreakExpBonuses.Update.Response>(
      backendUrl.admin.streakExpBonusById(id),
      { method: 'PUT', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminStreakExpBonuses, 'max');
    return result;
  });
}

export async function deleteStreakExpBonus(id: string): Promise<AdminAPI.StreakExpBonuses.Delete.Response> {
  return withSentryAction("deleteStreakExpBonus", async () => {
    const result = await serverFetch<AdminAPI.StreakExpBonuses.Delete.Response>(
      backendUrl.admin.streakExpBonusById(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminStreakExpBonuses, 'max');
    return result;
  });
}
