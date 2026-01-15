import { Logger } from "../../../utils/logger.js";
import type { TablesUpdate } from "../../../types/database.types.js";
import { supabase } from "../client.js";

type UserUpdate = TablesUpdate<"users">;
const logger = new Logger("SupabaseUsersQueries");

export interface GetUsersOptions {
  page?: number;
  limit?: number;
  role?: "admin" | "member";
  allow?: boolean;
  search?: string;
  getAll?: boolean;
}

export interface GetUsersResult {
  data: unknown[];
  count: number | null;
}

export async function getUsers(options: GetUsersOptions = {}): Promise<GetUsersResult> {
  const { page = 1, limit = 50, role, allow, search, getAll = false } = options;
  const maxLimit = Math.min(limit, 100);
  const offset = (page - 1) * maxLimit;

  let query = supabase
    .from("users")
    .select("*", { count: "exact" });

  if (role === "admin" || role === "member") {
    query = query.eq("role", role);
  }

  if (allow !== undefined) {
    query = query.eq("allow", allow);
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
    logger.error("Error fetching users:", error.message);
    throw error;
  }

  return { data: data || [], count };
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Error fetching user:", error.message);
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
    logger.error("Error updating user:", error.message);
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
    logger.error("Error updating user:", error.message);
    throw error;
  }

  return data;
}

