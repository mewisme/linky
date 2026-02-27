'use server'

import type { AdminAPI } from '@/types/admin.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getBroadcasts(
  params?: URLSearchParams
): Promise<AdminAPI.Broadcasts.Get.Response> {
  return serverFetch(backendUrl.admin.broadcasts(params), { token: true });
}

export async function createBroadcast(
  data: AdminAPI.Broadcasts.Post.Body
): Promise<AdminAPI.Broadcasts.Post.Response> {
  return serverFetch(backendUrl.admin.broadcasts(), {
    method: 'POST',
    body: JSON.stringify(data),
    token: true,
  });
}
