'use server'

import type { BlockRecord, BlockedUsersResponse } from '@/entities/notification/types/notifications.types';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

import { backendUrl } from '@/lib/http/backend-url';
import { cacheTags } from '@/lib/cache/tags';
import { revalidateTag } from 'next/cache';
import { serverFetch } from '@/lib/http/server-api';

export async function getBlockedUsers(): Promise<BlockedUsersResponse> {
  return withSentryQuery(
    "getBlockedUsers",
    async (token) => serverFetch<BlockedUsersResponse>(
      backendUrl.users.blocksMe(), { preloadedToken: token }
    ),
  );
}

export async function blockUser(userId: string): Promise<BlockRecord> {
  return withSentryAction("blockUser", async () => {
    const result = await serverFetch<BlockRecord>(
      backendUrl.users.blocks(),
      { method: 'POST', body: JSON.stringify({ blocked_user_id: userId }) }
    );
    revalidateTag(cacheTags.userBlocks, 'max');
    return result;
  });
}

export async function unblockUser(userId: string): Promise<void> {
  return withSentryAction("unblockUser", async () => {
    await serverFetch<void>(
      backendUrl.users.blockByUserId(userId),
      { method: 'DELETE' }
    );
    revalidateTag(cacheTags.userBlocks, 'max');
  });
}
