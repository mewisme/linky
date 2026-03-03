'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminUsers(
  params?: ServerActionQueryParams
): Promise<AdminAPI.GetUsers.Response> {
  const searchParams = toURLSearchParams(params);
  const key = searchParams?.toString() ?? '';
  return withSentryQuery(
    "getAdminUsers",
    async (token) => serverFetch<AdminAPI.GetUsers.Response>(
      backendUrl.admin.users(searchParams), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminUsers, key], tags: [cacheTags.adminUsers] },
  );
}

export async function updateAdminUser(
  id: string,
  data: AdminAPI.UpdateUser.Body
): Promise<AdminAPI.UpdateUser.Response> {
  return withSentryAction("updateAdminUser", async () => {
    const result = await serverFetch<AdminAPI.UpdateUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PUT', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.adminUsers, 'max');
    return result;
  });
}

export async function softDeleteAdminUser(id: string): Promise<AdminAPI.PatchUser.Response> {
  return withSentryAction("softDeleteAdminUser", async () => {
    const result = await serverFetch<AdminAPI.PatchUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PATCH', body: JSON.stringify({ deleted: true, deleted_at: new Date().toISOString() }), token: true }
    );
    revalidateTag(cacheTags.adminUsers, 'max');
    return result;
  });
}

export async function hardDeleteAdminUser(id: string): Promise<AdminAPI.DeleteUser.Response> {
  return withSentryAction("hardDeleteAdminUser", async () => {
    const result = await serverFetch<AdminAPI.DeleteUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.adminUsers, 'max');
    return result;
  });
}

export async function restoreAdminUser(id: string): Promise<AdminAPI.PatchUser.Response> {
  return withSentryAction("restoreAdminUser", async () => {
    const result = await serverFetch<AdminAPI.PatchUser.Response>(
      backendUrl.admin.userById(id),
      { method: 'PATCH', body: JSON.stringify({ deleted: false, deleted_at: null }), token: true }
    );
    revalidateTag(cacheTags.adminUsers, 'max');
    return result;
  });
}
