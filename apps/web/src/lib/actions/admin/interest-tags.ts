'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getAdminInterestTags(
  params?: URLSearchParams
): Promise<AdminAPI.InterestTags.Get.Response> {
  trackEventServer({ name: 'api_admin_interest_tags_get' });
  return serverFetch(backendUrl.admin.interestTags(params), { token: true });
}

export async function createInterestTag(
  data: AdminAPI.InterestTags.Create.Body
): Promise<AdminAPI.InterestTags.Create.Response> {
  trackEventServer({ name: 'api_admin_interest_tags_post' });
  return serverFetch(backendUrl.admin.interestTags(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function updateInterestTag(
  id: string,
  data: AdminAPI.InterestTags.Update.Body
): Promise<AdminAPI.InterestTags.Update.Response> {
  trackEventServer({ name: 'api_admin_interest_tags_id_put', properties: { id } });
  return serverFetch(backendUrl.admin.interestTagById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
    token: true,
  });
}

export async function deleteInterestTag(id: string): Promise<AdminAPI.InterestTags.Delete.Response> {
  trackEventServer({ name: 'api_admin_interest_tags_id_delete', properties: { id } });
  return serverFetch(backendUrl.admin.interestTagById(id), {
    method: 'DELETE',
    token: true,
  });
}

export async function hardDeleteInterestTag(id: string): Promise<AdminAPI.InterestTags.HardDelete.Response> {
  trackEventServer({ name: 'api_admin_interest_tags_id_hard_delete', properties: { id } });
  return serverFetch(backendUrl.admin.interestTagHardDelete(id), {
    method: 'DELETE',
    token: true,
  });
}

export async function importInterestTags(
  data: AdminAPI.InterestTags.Import.Body
): Promise<AdminAPI.InterestTags.Import.Response> {
  trackEventServer({
    name: 'api_admin_interest_tags_import_post',
    properties: { count: data.items?.length ?? 0 },
  });
  return serverFetch(backendUrl.admin.interestTagsImport(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}
