'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getAdminStreakExpBonuses(
  params?: URLSearchParams
): Promise<AdminAPI.StreakExpBonuses.Get.Response> {
  return serverFetch(backendUrl.admin.streakExpBonuses(params), { token: true });
}

export async function createStreakExpBonus(
  data: AdminAPI.StreakExpBonuses.Create.Body
): Promise<AdminAPI.StreakExpBonuses.Create.Response> {
  return serverFetch(backendUrl.admin.streakExpBonuses(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function updateStreakExpBonus(
  id: string,
  data: AdminAPI.StreakExpBonuses.Update.Body
): Promise<AdminAPI.StreakExpBonuses.Update.Response> {
  return serverFetch(backendUrl.admin.streakExpBonusById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteStreakExpBonus(id: string): Promise<AdminAPI.StreakExpBonuses.Delete.Response> {
  return serverFetch(backendUrl.admin.streakExpBonusById(id), {
    method: 'DELETE',
    token: true,
  });
}
