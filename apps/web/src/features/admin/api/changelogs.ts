'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getAdminChangelogs(
  params?: ServerActionQueryParams
): Promise<AdminAPI.Changelogs.Get.Response> {
  const searchParams = toURLSearchParams(params);
  const key = searchParams?.toString() ?? '';
  return withSentryQuery(
    "getAdminChangelogs",
    async (token) => serverFetch<AdminAPI.Changelogs.Get.Response>(
      backendUrl.admin.changelogs(searchParams), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.adminChangelogs, key], tags: [cacheTags.adminChangelogs] },
  );
}

export async function createChangelog(
  data: AdminAPI.Changelogs.Create.Body
): Promise<AdminAPI.Changelogs.Create.Response> {
  return withSentryAction("createChangelog", async () => {
    const result = await serverFetch<AdminAPI.Changelogs.Create.Response>(
      backendUrl.admin.changelogs(),
      { method: 'POST', body: JSON.stringify(data) }
    );
    revalidateTag(cacheTags.adminChangelogs, 'max');
    return result;
  });
}

export async function updateChangelog(
  id: string,
  data: AdminAPI.Changelogs.Update.Body
): Promise<AdminAPI.Changelogs.Update.Response> {
  return withSentryAction("updateChangelog", async () => {
    const result = await serverFetch<AdminAPI.Changelogs.Update.Response>(
      backendUrl.admin.changelogById(id),
      { method: 'PUT', body: JSON.stringify(data) }
    );
    revalidateTag(cacheTags.adminChangelogs, 'max');
    return result;
  });
}

export async function deleteChangelog(id: string): Promise<AdminAPI.Changelogs.Delete.Response> {
  return withSentryAction("deleteChangelog", async () => {
    const result = await serverFetch<AdminAPI.Changelogs.Delete.Response>(
      backendUrl.admin.changelogById(id),
      { method: 'DELETE' }
    );
    revalidateTag(cacheTags.adminChangelogs, 'max');
    return result;
  });
}
