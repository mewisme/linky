import type { AdminUnifiedUser, AdminUserUpdate } from "@/domains/admin/types/admin.types.js";
import {
  getAdminUsersUnified,
  getUserById,
  patchUser,
  updateUser,
} from "@/infra/supabase/repositories/index.js";
import { getOrSet, invalidate, invalidateByPrefix } from "@/infra/redis/cache/index.js";

import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { REDIS_CACHE_TTL_SECONDS } from "@/infra/redis/cache/policy.js";
import { calculateLevelFromExp } from "@/logic/level-from-exp.js";
import { clerk } from "@/infra/clerk/client.js";
import { hashFilters } from "@/infra/redis/cache/hash.js";

export async function listUsers(params: {
  getAll: boolean;
  page: number;
  limit: number;
  role?: "admin" | "member";
  deleted?: boolean;
  search?: string;
}): Promise<{ data: AdminUnifiedUser[]; count: number | null }> {
  const filters = {
    getAll: params.getAll,
    page: params.page,
    limit: params.limit,
    role: params.role,
    deleted: params.deleted,
    search: params.search,
  };

  const raw = await getOrSet(
    REDIS_CACHE_KEYS.admin("users", hashFilters(filters)),
    REDIS_CACHE_TTL_SECONDS.ADMIN_LISTS,
    async () =>
      await getAdminUsersUnified({
        page: params.page,
        limit: params.limit,
        role: params.role,
        deleted: params.deleted,
        search: params.search,
        getAll: params.getAll,
      }),
  );

  const enriched: AdminUnifiedUser[] = (raw.data || [])
    .filter((row): row is typeof row & { user_id: string; clerk_user_id: string; role: "admin" | "member"; created_at: string; updated_at: string } =>
      row.user_id != null && row.clerk_user_id != null && row.role != null && row.created_at != null && row.updated_at != null
    )
    .map((row) => {
      const level = row.total_exp_seconds != null
        ? calculateLevelFromExp(row.total_exp_seconds).level
        : 1;

      return {
        id: row.user_id,
        clerk_user_id: row.clerk_user_id,
        email: row.email,
        role: row.role,
        deleted: row.deleted,
        created_at: row.created_at,
        first_name: row.first_name,
        last_name: row.last_name,
        avatar_url: row.avatar_url,
        country: row.country,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        details:
          row.bio != null || row.gender != null || row.date_of_birth != null
            ? {
              bio: row.bio ?? null,
              gender: row.gender ?? null,
              date_of_birth: row.date_of_birth ?? null,
            }
            : null,
        interest_tag_names: row.interest_tags ?? [],
        embedding:
          row.embedding_model != null ||
            row.embedding_source_hash != null ||
            row.embedding_updated_at != null
            ? {
              model: row.embedding_model ?? null,
              source_hash: row.embedding_source_hash ?? "",
              updated_at: row.embedding_updated_at ?? "",
            }
            : null,
        level,
      };
    });

  return { data: enriched, count: raw.count };
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