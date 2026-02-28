import type { BlockRecord, BlockedUserWithDetails } from "@/domains/user/types/user-block.types.js";
import {
  checkBlockExists,
  createBlock,
  deleteBlock,
  getBlockedUserIds,
  getBlockedUsersWithDetails as getBlockedUsersWithDetailsRepo,
} from "@/infra/supabase/repositories/user-blocks.js";

import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "@/infra/redis/cache/policy.js";
import { createLogger } from "@/utils/logger.js";
import { getOrSet } from "@/infra/redis/cache/index.js";
import { invalidateCacheKey } from "@/infra/redis/cache-utils.js";

const logger = createLogger("api:user:service:user-block");

export async function blockUser(blockerId: string, blockedId: string): Promise<BlockRecord> {
  if (blockerId === blockedId) {
    throw new Error("Cannot block yourself");
  }

  const exists = await checkBlockExists(blockerId, blockedId);
  if (exists) {
    throw new Error("User is already blocked");
  }

  const block = await createBlock(blockerId, blockedId);

  await invalidateCacheKey(REDIS_CACHE_KEYS.userBlocks(blockerId));

  logger.info("User %s blocked user %s", blockerId, blockedId);

  return block;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const exists = await checkBlockExists(blockerId, blockedId);
  if (!exists) {
    throw new Error("User is not blocked");
  }

  const result = await deleteBlock(blockerId, blockedId);

  await invalidateCacheKey(REDIS_CACHE_KEYS.userBlocks(blockerId));

  logger.info("User %s unblocked user %s", blockerId, blockedId);

  return result;
}

export async function getBlockedUsers(userId: string): Promise<string[]> {
  return getOrSet(
    REDIS_CACHE_KEYS.userBlocks(userId),
    REDIS_CACHE_TTL_SECONDS.USER_BLOCKS,
    async () => {
      return await getBlockedUserIds(userId);
    }
  );
}

export async function getBlockedUsersWithDetails(userId: string): Promise<BlockedUserWithDetails[]> {
  const rows = await getBlockedUsersWithDetailsRepo(userId);

  return rows.map((row) => ({
    id: row.id,
    blocked_user_id: row.blocked_user_id,
    first_name: row.users?.first_name ?? null,
    last_name: row.users?.last_name ?? null,
    avatar_url: row.users?.avatar_url ?? null,
    blocked_at: row.created_at,
  }));
}

export async function isInteractionAllowed(userAId: string, userBId: string): Promise<boolean> {
  const [blockedByA, blockedByB] = await Promise.all([
    getBlockedUsers(userAId),
    getBlockedUsers(userBId),
  ]);

  const aBlockedB = blockedByA.includes(userBId);
  const bBlockedA = blockedByB.includes(userAId);

  return !aBlockedB && !bBlockedA;
}
