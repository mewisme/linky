'use server'

import type { AdminAPI } from '@/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function getAdminStreakExpBonuses(
  params?: URLSearchParams
): Promise<AdminAPI.StreakExpBonuses.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getAdminStreakExpBonuses",
    async (token) => serverFetch<AdminAPI.StreakExpBonuses.Get.Response>(
      backendUrl.admin.streakExpBonuses(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminStreakExpBonuses, key], tags: [cacheTags.adminStreakExpBonuses] },
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
