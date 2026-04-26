'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminStreakExpBonuses(
  params?: ServerActionQueryParams
): Promise<AdminAPI.StreakExpBonuses.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminStreakExpBonuses",
    async () => serverFetch<AdminAPI.StreakExpBonuses.Get.Response>(backendUrl.admin.streakExpBonuses(searchParams)),
  );
}

export async function createStreakExpBonus(
  data: AdminAPI.StreakExpBonuses.Create.Body
): Promise<AdminAPI.StreakExpBonuses.Create.Response> {
  return withSentryAction("createStreakExpBonus", async () =>
    serverFetch<AdminAPI.StreakExpBonuses.Create.Response>(
      backendUrl.admin.streakExpBonuses(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function updateStreakExpBonus(
  id: string,
  data: AdminAPI.StreakExpBonuses.Update.Body
): Promise<AdminAPI.StreakExpBonuses.Update.Response> {
  return withSentryAction("updateStreakExpBonus", async () =>
    serverFetch<AdminAPI.StreakExpBonuses.Update.Response>(
      backendUrl.admin.streakExpBonusById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function deleteStreakExpBonus(id: string): Promise<AdminAPI.StreakExpBonuses.Delete.Response> {
  return withSentryAction("deleteStreakExpBonus", async () =>
    serverFetch<AdminAPI.StreakExpBonuses.Delete.Response>(
      backendUrl.admin.streakExpBonusById(id),
      { method: 'DELETE' }
    ));
}
