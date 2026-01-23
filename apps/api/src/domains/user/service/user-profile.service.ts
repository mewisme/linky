import type { UserProfileAggregate } from "../types/user-profile.types.js";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { getUserById, getUserDetailsWithTags, getUserSettingsByUserId } from "../../../infra/supabase/repositories/index.js";
import { getOrSet } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";

export async function getUserProfileAggregateByClerkUserId(clerkUserId: string): Promise<UserProfileAggregate | null> {
  if (!clerkUserId || typeof clerkUserId !== "string" || clerkUserId.trim() === "") {
    return null;
  }

  const userId = await getUserIdByClerkId(clerkUserId);
  if (!userId) {
    return null;
  }

  return await getOrSet(
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

