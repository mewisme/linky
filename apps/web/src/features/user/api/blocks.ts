'use server'

import 'server-only';

import type { BlockRecord, BlockedUsersResponse } from '@/entities/notification/types/notifications.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getBlockedUsers(): Promise<BlockedUsersResponse> {
  return withSentryQuery(
    "getBlockedUsers",
    async () => serverFetch<BlockedUsersResponse>(backendUrl.users.blocksMe()),
  );
}

export async function blockUser(userId: string): Promise<BlockRecord> {
  return withSentryAction("blockUser", async () =>
    serverFetch<BlockRecord>(
      backendUrl.users.blocks(),
      { method: 'POST', body: JSON.stringify({ blocked_user_id: userId }) }
    ));
}

export async function unblockUser(userId: string): Promise<void> {
  return withSentryAction("unblockUser", async () => {
    await serverFetch<void>(
      backendUrl.users.blockByUserId(userId),
      { method: 'DELETE' }
    );
  });
}
