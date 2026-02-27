'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminChangelogs(
  params?: URLSearchParams
): Promise<AdminAPI.Changelogs.Get.Response> {
  return withSentryAction("getAdminChangelogs", async () => {
    trackEventServer({ name: 'api_admin_changelogs_get' });
    return serverFetch(backendUrl.admin.changelogs(params), { token: true });
  });
}

export async function createChangelog(
  data: AdminAPI.Changelogs.Create.Body
): Promise<AdminAPI.Changelogs.Create.Response> {
  return withSentryAction("createChangelog", async () => {
    trackEventServer({ name: 'api_admin_changelogs_post' });
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
    trackEventServer({ name: 'api_admin_changelogs_id_put', properties: { id } });
    return serverFetch(backendUrl.admin.changelogById(id), {
      method: 'PUT',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function deleteChangelog(id: string): Promise<AdminAPI.Changelogs.Delete.Response> {
  return withSentryAction("deleteChangelog", async () => {
    trackEventServer({ name: 'api_admin_changelogs_id_delete', properties: { id } });
    return serverFetch(backendUrl.admin.changelogById(id), {
      method: 'DELETE',
      token: true,
    });
  });
}
