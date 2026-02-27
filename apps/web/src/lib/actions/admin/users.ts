'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminUsers(
  params?: URLSearchParams
): Promise<AdminAPI.GetUsers.Response> {
  return withSentryAction("getAdminUsers", async () => {
    trackEventServer({ name: 'api_admin_users_get' });
    return serverFetch(backendUrl.admin.users(params), { token: true });
  });
}

export async function updateAdminUser(
  id: string,
  data: AdminAPI.UpdateUser.Body
): Promise<AdminAPI.UpdateUser.Response> {
  return withSentryAction("updateAdminUser", async () => {
    trackEventServer({ name: 'api_admin_users_id_put', properties: { id } });
    return serverFetch(backendUrl.admin.userById(id), {
      method: 'PUT',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function deleteAdminUser(id: string): Promise<AdminAPI.DeleteUser.Response> {
  return withSentryAction("deleteAdminUser", async () => {
    trackEventServer({ name: 'api_admin_users_id_delete', properties: { id } });
    return serverFetch(backendUrl.admin.userById(id), {
      method: 'DELETE',
      token: true,
    });
  });
}

export async function restoreAdminUser(id: string): Promise<AdminAPI.PatchUser.Response> {
  return withSentryAction("restoreAdminUser", async () => {
    trackEventServer({ name: 'api_admin_users_id_patch', properties: { id } });
    return serverFetch(backendUrl.admin.userById(id), {
      method: 'PATCH',
      body: JSON.stringify({ deleted: false, deleted_at: null }),
      token: true,
    });
  });
}
