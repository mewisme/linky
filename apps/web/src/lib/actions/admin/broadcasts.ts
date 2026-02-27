'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getBroadcasts(
  params?: URLSearchParams
): Promise<AdminAPI.Broadcasts.Get.Response> {
  trackEventServer({ name: 'api_admin_broadcasts_get' });
  return serverFetch(backendUrl.admin.broadcasts(params), { token: true });
}

export async function createBroadcast(
  data: AdminAPI.Broadcasts.Post.Body
): Promise<AdminAPI.Broadcasts.Post.Response> {
  trackEventServer({ name: 'api_admin_broadcasts_post' });
  return serverFetch(backendUrl.admin.broadcasts(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}
