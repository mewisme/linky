'use server'

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getAdminConfig(): Promise<AdminAPI.Config.Get.Response> {
  return withSentryQuery(
    "getAdminConfig",
    (token) =>
      serverFetch<AdminAPI.Config.Get.Response>(backendUrl.admin.config(), {
        preloadedToken: token,
      }),
    { keyParts: [cacheTags.adminConfig], tags: [cacheTags.adminConfig] },
  );
}

export async function getAdminConfigByKey(key: string): Promise<AdminAPI.Config.GetByKey.Response | null> {
  return withSentryQuery(
    "getAdminConfigByKey",
    (token) =>
      serverFetch<AdminAPI.Config.GetByKey.Response>(backendUrl.admin.configByKey(key), {
        preloadedToken: token,
      }),
    { keyParts: [cacheTags.adminConfig, key], tags: [cacheTags.adminConfig] },
  );
}

export async function setAdminConfig(
  data: AdminAPI.Config.Set.Body,
): Promise<AdminAPI.Config.Set.Response> {
  return withSentryAction("setAdminConfig", async () => {
    const result = await serverFetch<AdminAPI.Config.Set.Response>(backendUrl.admin.config(), {
      method: "POST",
      body: JSON.stringify(data),
      token: true,
    });
    revalidateTag(cacheTags.adminConfig, "max");
    return result;
  });
}

export async function unsetAdminConfig(key: string): Promise<void> {
  return withSentryAction("unsetAdminConfig", async () => {
    await serverFetch(backendUrl.admin.configByKey(key), {
      method: "DELETE",
      token: true,
    });
    revalidateTag(cacheTags.adminConfig, "max");
  });
}
