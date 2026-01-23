import { getUserById, getUsers, patchUser, updateUser } from "../../../infra/supabase/repositories/index.js";
import type { AdminUserUpdate } from "../types/admin.types.js";
import { getOrSet, invalidate, invalidateByPrefix } from "../../../infra/redis/cache/index.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";
import { hashFilters } from "../../../infra/redis/cache/hash.js";

export async function listUsers(params: {
  getAll: boolean;
  page: number;
  limit: number;
  role?: "admin" | "member";
  allow?: boolean;
  search?: string;
}) {
  const filters = {
    getAll: params.getAll,
    page: params.page,
    limit: params.limit,
    role: params.role,
    allow: params.allow,
    search: params.search,
  };

  return await getOrSet(
    REDIS_CACHE_KEYS.admin("users", hashFilters(filters)),
    REDIS_CACHE_TTL_SECONDS.ADMIN_LISTS,
    async () =>
      await getUsers({
        page: params.page,
        limit: params.limit,
        role: params.role,
        allow: params.allow,
        search: params.search,
        getAll: params.getAll,
      }),
  );
}

export async function getUser(id: string) {
  return await getUserById(id);
}

export async function updateAdminUser(id: string, userData: AdminUserUpdate) {
  const updated = await updateUser(id, userData);
  await Promise.allSettled([
    invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("users")),
    invalidate(REDIS_CACHE_KEYS.userProfile(id)),
  ]);
  return updated;
}

export async function patchAdminUser(id: string, userData: Partial<AdminUserUpdate>) {
  const updated = await patchUser(id, userData);
  await Promise.allSettled([
    invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("users")),
    invalidate(REDIS_CACHE_KEYS.userProfile(id)),
  ]);
  return updated;
}

