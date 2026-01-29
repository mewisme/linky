import { getOrSet, invalidate, invalidateByPrefix } from "../../../infra/redis/cache/index.js";
import { getUserById, getUsers, patchUser, updateUser } from "../../../infra/supabase/repositories/index.js";

import type { AdminUserUpdate } from "../types/admin.types.js";
import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "../../../infra/redis/cache/policy.js";
import { clerk } from "../../../infra/clerk/client.js";
import { hashFilters } from "../../../infra/redis/cache/hash.js";
import { scheduleEmbeddingRegeneration } from "../../user/service/embedding-job.service.js";

export async function listUsers(params: {
  getAll: boolean;
  page: number;
  limit: number;
  role?: "admin" | "member";
  deleted?: boolean;
  search?: string;
}) {
  const filters = {
    getAll: params.getAll,
    page: params.page,
    limit: params.limit,
    role: params.role,
    deleted: params.deleted,
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
        deleted: params.deleted,
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
  scheduleEmbeddingRegeneration(id);
  return updated;
}

export async function patchAdminUser(id: string, userData: Partial<AdminUserUpdate>) {
  const updated = await patchUser(id, userData);
  await Promise.allSettled([
    invalidateByPrefix(REDIS_CACHE_KEYS.adminPrefix("users")),
    invalidate(REDIS_CACHE_KEYS.userProfile(id)),
  ]);
  scheduleEmbeddingRegeneration(id);
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const user = await getUser(id);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.deleted) {
    throw new Error("User already deleted");
  }
  if (user.role === "admin") {
    throw new Error("Admin users cannot be deleted");
  }

  await clerk.users.deleteUser(user.clerk_user_id);
}