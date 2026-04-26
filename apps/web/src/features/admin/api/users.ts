'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminUsers(
  params?: ServerActionQueryParams
): Promise<AdminAPI.GetUsers.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getAdminUsers",
    async () => serverFetch<AdminAPI.GetUsers.Response>(backendUrl.admin.users(searchParams)),
  );
}

export async function updateAdminUser(
  id: string,
  data: AdminAPI.UpdateUser.Body
): Promise<AdminAPI.UpdateUser.Response> {
  return withSentryAction("updateAdminUser", async () =>
    serverFetch<AdminAPI.UpdateUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function softDeleteAdminUser(id: string): Promise<AdminAPI.PatchUser.Response> {
  return withSentryAction("softDeleteAdminUser", async () =>
    serverFetch<AdminAPI.PatchUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PATCH', body: JSON.stringify({ deleted: true, deleted_at: new Date().toISOString() }) }
    ));
}

export async function softDeleteAdminUsers(ids: string[]): Promise<AdminAPI.PatchUsersBatch.Response> {
  return withSentryAction("softDeleteAdminUsers", async () =>
    serverFetch<AdminAPI.PatchUsersBatch.Response>(
      backendUrl.admin.usersBatch(),
      {
        method: 'PATCH',
        body: JSON.stringify({ ids, deleted: true, deleted_at: new Date().toISOString() }),
      }
    ));
}

export async function hardDeleteAdminUser(id: string): Promise<AdminAPI.DeleteUser.Response> {
  return withSentryAction("hardDeleteAdminUser", async () =>
    serverFetch<AdminAPI.DeleteUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'DELETE' }
    ));
}

export async function hardDeleteAdminUsers(ids: string[]): Promise<AdminAPI.DeleteUsersBatch.Response> {
  return withSentryAction("hardDeleteAdminUsers", async () =>
    serverFetch<AdminAPI.DeleteUsersBatch.Response>(
      backendUrl.admin.usersBatch(),
      { method: 'DELETE', body: JSON.stringify({ ids }) }
    ));
}

export async function restoreAdminUser(id: string): Promise<AdminAPI.PatchUser.Response> {
  return withSentryAction("restoreAdminUser", async () =>
    serverFetch<AdminAPI.PatchUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PATCH', body: JSON.stringify({ deleted: false, deleted_at: null }) }
    ));
}

export async function restoreAdminUsers(ids: string[]): Promise<AdminAPI.PatchUsersBatch.Response> {
  return withSentryAction("restoreAdminUsers", async () =>
    serverFetch<AdminAPI.PatchUsersBatch.Response>(
      backendUrl.admin.usersBatch(),
      { method: 'PATCH', body: JSON.stringify({ ids, deleted: false, deleted_at: null }) }
    ));
}
