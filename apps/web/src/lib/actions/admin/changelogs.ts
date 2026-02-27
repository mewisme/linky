'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminChangelogs(
  params?: URLSearchParams
): Promise<AdminAPI.Changelogs.Get.Response> {
  return withSentryAction("getAdminChangelogs", async () => {
    return serverFetch(backendUrl.admin.changelogs(params), { token: true });
  });
}

export async function createChangelog(
  data: AdminAPI.Changelogs.Create.Body
): Promise<AdminAPI.Changelogs.Create.Response> {
  return withSentryAction("createChangelog", async () => {
    return serverFetch(backendUrl.admin.changelogs(), {
      method: 'POST',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function updateChangelog(
  id: string,
  data: AdminAPI.Changelogs.Update.Body
): Promise<AdminAPI.Changelogs.Update.Response> {
  return withSentryAction("updateChangelog", async () => {
    return serverFetch(backendUrl.admin.changelogById(id), {
      method: 'PUT',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function deleteChangelog(id: string): Promise<AdminAPI.Changelogs.Delete.Response> {
  return withSentryAction("deleteChangelog", async () => {
    return serverFetch(backendUrl.admin.changelogById(id), {
      method: 'DELETE',
      token: true,
    });
  });
}
