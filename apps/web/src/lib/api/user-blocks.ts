import type { BlockRecord, BlockedUsersResponse } from "@/types/notifications.types";

import { client } from "@/lib/client";

export async function blockUser(
  userId: string,
  token: string
): Promise<BlockRecord> {
  return client.post<BlockRecord>(
    "/api/users/blocks",
    { blocked_user_id: userId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function unblockUser(
  userId: string,
  token: string
): Promise<void> {
  return client.delete<void>(`/api/users/blocks/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getBlockedUsers(
  token: string
): Promise<BlockedUsersResponse> {
  return client.get<BlockedUsersResponse>("/api/users/blocks/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
