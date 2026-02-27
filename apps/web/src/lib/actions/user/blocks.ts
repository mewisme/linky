'use server'

import type { BlockedUsersResponse, BlockRecord } from '@/types/notifications.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getBlockedUsers(): Promise<BlockedUsersResponse> {
  return serverFetch(backendUrl.users.blocksMe(), { token: true });
}

export async function blockUser(userId: string): Promise<BlockRecord> {
  return serverFetch(backendUrl.users.blocks(), {
    method: 'POST',
    body: JSON.stringify({ blocked_user_id: userId }),
    token: true,
  });
}

export async function unblockUser(userId: string): Promise<void> {
  return serverFetch(backendUrl.users.blockByUserId(userId), {
    method: 'DELETE',
    token: true,
  });
}
