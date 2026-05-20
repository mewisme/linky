'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminExpBonuses(
  params?: ServerActionQueryParams
): Promise<AdminAPI.ExpBonuses.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminExpBonuses",
    async () => serverFetch<AdminAPI.ExpBonuses.Get.Response>(backendUrl.admin.expBonuses(searchParams)),
  );
}

export async function createExpBonus(
  data: AdminAPI.ExpBonuses.Create.Body
): Promise<AdminAPI.ExpBonuses.Create.Response> {
  return withSentryAction("createExpBonus", async () =>
    serverFetch<AdminAPI.ExpBonuses.Create.Response>(
      backendUrl.admin.expBonuses(),
      { method: 'POST', body: JSON.stringify(data) }
    ));
}

export async function updateExpBonus(
  id: string,
  data: AdminAPI.ExpBonuses.Update.Body
): Promise<AdminAPI.ExpBonuses.Update.Response> {
  return withSentryAction("updateExpBonus", async () =>
    serverFetch<AdminAPI.ExpBonuses.Update.Response>(
      backendUrl.admin.expBonusById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function deleteExpBonus(id: string): Promise<AdminAPI.ExpBonuses.Delete.Response> {
  return withSentryAction("deleteExpBonus", async () =>
    serverFetch<AdminAPI.ExpBonuses.Delete.Response>(
      backendUrl.admin.expBonusById(id),
      { method: 'DELETE' }
    ));
}
