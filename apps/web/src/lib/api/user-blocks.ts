import type { BlockRecord, BlockedUsersResponse } from "@/types/notifications.types";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { deleteData, fetchData, postData } from "@/lib/api/fetch/client-api";

export async function blockUser(
  userId: string,
  token: string
): Promise<BlockRecord> {
  return postData<BlockRecord>(apiUrl.users.blocks(), {
    token,
    body: { blocked_user_id: userId },
  });
}

export async function unblockUser(
  userId: string,
  token: string
): Promise<void> {
  return deleteData<void>(apiUrl.users.blockByUserId(userId), { token });
}

export async function getBlockedUsers(
  token: string
): Promise<BlockedUsersResponse> {
  return fetchData<BlockedUsersResponse>(apiUrl.users.blocksMe(), { token });
}
