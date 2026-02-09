import { createLogger } from "@ws/logger";
import { redisClient } from "@/infra/redis/client.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:admin-cache");

const ADMIN_CACHE_TTL_SECONDS = 5 * 60;

function adminRoleCacheKey(clerkUserId: string): string {
  return `admin:role:${clerkUserId}`;
}

export async function checkIfUserIsAdmin(clerkUserId: string): Promise<boolean> {
  try {
    const key = adminRoleCacheKey(clerkUserId);
    const cached = await redisClient.get(key);
    if (cached === "admin") {
      return true;
    }
    if (cached === "user") {
      return false;
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error || !user) {
      return false;
    }

    const isAdmin = user.role === "admin";

    await redisClient.set(key, isAdmin ? "admin" : "user", {
      EX: ADMIN_CACHE_TTL_SECONDS,
    });

    return isAdmin;
  } catch (error) {
    logger.error("Error checking admin status: %o", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function refreshAdminCache(): Promise<void> {
  try {
    const { data: adminUsers, error } = await supabase
      .from("users")
      .select("clerk_user_id")
      .eq("role", "admin");

    if (error) {
      logger.error("Error refreshing admin cache: %o", error instanceof Error ? error : new Error(String(error)));
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      return;
    }

    for (const user of adminUsers) {
      const key = adminRoleCacheKey(user.clerk_user_id);
      await redisClient.set(key, "admin", { EX: ADMIN_CACHE_TTL_SECONDS });
    }
  } catch (error) {
    logger.error("Error refreshing admin cache: %o", error instanceof Error ? error : new Error(String(error)));
  }
}

export async function initializeAdminCache(): Promise<void> {
  await refreshAdminCache();
}

