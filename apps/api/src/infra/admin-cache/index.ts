import { createLogger } from "@/utils/logger.js";
import { redisClient } from "@/infra/redis/client.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:admin-cache");

const ADMIN_CACHE_TTL_SECONDS = 5 * 60;

export type AdminRole = "admin" | "superadmin";

function adminRoleCacheKey(clerkUserId: string): string {
  return `admin:role:${clerkUserId}`;
}

export async function checkIfUserIsAdmin(clerkUserId: string): Promise<boolean> {
  const role = await getAdminRole(clerkUserId);
  return role === "admin" || role === "superadmin";
}

export async function getAdminRole(clerkUserId: string): Promise<AdminRole | null> {
  try {
    const key = adminRoleCacheKey(clerkUserId);
    const cached = await redisClient.get(key);
    if (cached === "admin" || cached === "superadmin") {
      return cached;
    }
    if (cached === "user") {
      return null;
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error || !user) {
      return null;
    }

    const role = user.role === "admin" || user.role === "superadmin" ? user.role : null;
    const cacheValue = role ?? "user";
    await redisClient.set(key, cacheValue, {
      EX: ADMIN_CACHE_TTL_SECONDS,
    });

    return role;
  } catch (error) {
    logger.error(error as Error, "Error checking admin role");
    return null;
  }
}

async function refreshAdminCache(): Promise<void> {
  try {
    const { data: adminUsers, error } = await supabase
      .from("users")
      .select("clerk_user_id, role")
      .in("role", ["admin", "superadmin"]);

    if (error) {
      logger.error(error as Error, "Error refreshing admin cache");
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      return;
    }

    for (const user of adminUsers) {
      const key = adminRoleCacheKey(user.clerk_user_id);
      const value = user.role === "superadmin" ? "superadmin" : "admin";
      await redisClient.set(key, value, { EX: ADMIN_CACHE_TTL_SECONDS });
    }
  } catch (error) {
    logger.error(error as Error, "Error refreshing admin cache");
  }
}

export async function initializeAdminCache(): Promise<void> {
  await refreshAdminCache();
}

