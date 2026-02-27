'use server'

import type { BlockedUsersResponse, BlockRecord } from '@/types/notifications.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getBlockedUsers(): Promise<BlockedUsersResponse> {
  trackEventServer({ name: 'api_users_blocks_me_get' });
  return serverFetch(backendUrl.users.blocksMe(), { token: true });
}

export async function blockUser(userId: string): Promise<BlockRecord> {
  trackEventServer({ name: 'api_users_blocks_post', properties: { user_id: userId } });
  return serverFetch(backendUrl.users.blocks(), {
    method: 'POST',
    body: JSON.stringify({ blocked_user_id: userId }),
    token: true,
  });
}

export async function unblockUser(userId: string): Promise<void> {
  trackEventServer({ name: 'api_users_blocks_blocked_user_id_delete', properties: { user_id: userId } });
  return serverFetch(backendUrl.users.blockByUserId(userId), {
    method: 'DELETE',
    token: true,
  });
}
