'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getAdminInterestTags(
  params?: URLSearchParams
): Promise<AdminAPI.InterestTags.Get.Response> {
  return withSentryAction("getAdminInterestTags", async () => {
    return serverFetch(backendUrl.admin.interestTags(params), { token: true });
  });
}

export async function createInterestTag(
  data: AdminAPI.InterestTags.Create.Body
): Promise<AdminAPI.InterestTags.Create.Response> {
  return withSentryAction("createInterestTag", async () => {
    return serverFetch(backendUrl.admin.interestTags(), {
      method: 'POST',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function updateInterestTag(
  id: string,
  data: AdminAPI.InterestTags.Update.Body
): Promise<AdminAPI.InterestTags.Update.Response> {
  return withSentryAction("updateInterestTag", async () => {
    return serverFetch(backendUrl.admin.interestTagById(id), {
      method: 'PUT',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function deleteInterestTag(id: string): Promise<AdminAPI.InterestTags.Delete.Response> {
  return withSentryAction("deleteInterestTag", async () => {
    return serverFetch(backendUrl.admin.interestTagById(id), {
      method: 'DELETE',
      token: true,
    });
  });
}

export async function hardDeleteInterestTag(id: string): Promise<AdminAPI.InterestTags.HardDelete.Response> {
  return withSentryAction("hardDeleteInterestTag", async () => {
    return serverFetch(backendUrl.admin.interestTagHardDelete(id), {
      method: 'DELETE',
      token: true,
    });
  });
}

export async function importInterestTags(
  data: AdminAPI.InterestTags.Import.Body
): Promise<AdminAPI.InterestTags.Import.Response> {
  return withSentryAction("importInterestTags", async () => {
    return serverFetch(backendUrl.admin.interestTagsImport(), {
      method: 'POST',
      body: JSON.stringify(data),
      token: true,
    });
  });
}
