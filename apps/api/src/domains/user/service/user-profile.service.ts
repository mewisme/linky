import { getUserById, getUserDetailsWithTags, getUserSettingsByUserId } from "@/infra/supabase/repositories/index.js";

import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "@/infra/redis/cache/policy.js";
import type { UserProfileAggregate } from "@/domains/user/types/user-profile.types.js";
import { getOrSet } from "@/infra/redis/cache/index.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

export async function getUserProfileAggregateByUserId(userId: string): Promise<UserProfileAggregate | null> {
  return getOrSet(
    REDIS_CACHE_KEYS.userProfile(userId),
    REDIS_CACHE_TTL_SECONDS.USER_PROFILE,
    async () => {
      const [user, details, settings] = await Promise.all([
        getUserById(userId),
        getUserDetailsWithTags(userId),
        getUserSettingsByUserId(userId),
      ]);

      if (!user) {
        return null;
      }

      return { user, details, settings };
    },
  );
}

export async function getUserProfileAggregateByClerkUserId(clerkUserId: string): Promise<UserProfileAggregate | null> {
  if (!clerkUserId || typeof clerkUserId !== "string" || clerkUserId.trim() === "") {
    return null;
  }

  const userId = await getUserIdByClerkId(clerkUserId);
  if (!userId) {
    return null;
  }

  return getUserProfileAggregateByUserId(userId);
}

