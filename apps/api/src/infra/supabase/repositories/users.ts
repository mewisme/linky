import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

type UserUpdate = TablesUpdate<"users">;
type UserInsert = TablesInsert<"users">;
const logger = createLogger("infra:supabase:repositories:users");

export interface GetUsersOptions {
  page?: number;
  limit?: number;
  role?: "admin" | "member";
  deleted?: boolean;
  search?: string;
  getAll?: boolean;
}

export interface GetUsersResult {
  data: unknown[];
  count: number | null;
}

export async function getUsers(options: GetUsersOptions = {}): Promise<GetUsersResult> {
  const { page = 1, limit = 50, role, deleted, search, getAll = false } = options;
  const maxLimit = Math.min(limit, 100);
  const offset = (page - 1) * maxLimit;

  let query = supabase
    .from("users")
    .select("*", { count: "exact" });

  if (role === "admin" || role === "member") {
    query = query.eq("role", role);
  }

  if (deleted !== undefined) {
    query = query.eq("deleted", deleted);
  }

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  query = query.order("created_at", { ascending: false });

  if (!getAll) {
    query = query.range(offset, offset + maxLimit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching users: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count };
}

export async function getActiveUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .or("deleted.is.null,deleted.eq.false");

  if (error) {
    logger.error("Error fetching active user IDs: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map((row) => row.id);
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Error fetching user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching user by email: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getUserByClerkId(clerkUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching user by clerk id: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function updateUser(id: string, userData: UserUpdate) {
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .single();

  if (!existingUser) {
    throw new Error("User not found");
  }

  if (userData.clerk_user_id) {
    const { data: conflictUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userData.clerk_user_id)
      .neq("id", id)
      .single();

    if (conflictUser) {
      throw new Error("User with this clerk_user_id already exists");
    }
  }

  const { data, error } = await supabase
    .from("users")
    .update(userData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function patchUser(id: string, userData: Partial<UserUpdate>) {
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .single();

  if (!existingUser) {
    throw new Error("User not found");
  }

  if (userData.clerk_user_id) {
    const { data: conflictUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userData.clerk_user_id)
      .neq("id", id)
      .single();

    if (conflictUser) {
      throw new Error("User with this clerk_user_id already exists");
    }
  }

  const { data, error } = await supabase
    .from("users")
    .update(userData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function softDeleteUserByClerkId(clerkUserId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    logger.error("Error soft-deleting user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function createUser(params: UserInsert) {
  const { data, error } = await supabase.from("users").insert(params).select().single();

  if (error) {
    logger.error("Error creating user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getUsersIdsPaginated(
  options: { page?: number; limit?: number; deleted?: boolean } = {}
): Promise<{ ids: string[]; hasMore: boolean }> {
  const { page = 1, limit = 100, deleted = false } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("users")
    .select("id", { count: "exact" })
    .eq("deleted", deleted)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching user IDs: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const ids = (data || []).map((row: { id: string }) => row.id);
  const total = count ?? 0;
  const hasMore = offset + ids.length < total;

  return { ids, hasMore };
}