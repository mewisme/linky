'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getAdminChangelogs(
  params?: URLSearchParams
): Promise<AdminAPI.Changelogs.Get.Response> {
  return serverFetch(backendUrl.admin.changelogs(params), { token: true });
}

export async function createChangelog(
  data: AdminAPI.Changelogs.Create.Body
): Promise<AdminAPI.Changelogs.Create.Response> {
  return serverFetch(backendUrl.admin.changelogs(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function updateChangelog(
  id: string,
  data: AdminAPI.Changelogs.Update.Body
): Promise<AdminAPI.Changelogs.Update.Response> {
  return serverFetch(backendUrl.admin.changelogById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteChangelog(id: string): Promise<AdminAPI.Changelogs.Delete.Response> {
  return serverFetch(backendUrl.admin.changelogById(id), {
    method: 'DELETE',
    token: true,
  });
}
