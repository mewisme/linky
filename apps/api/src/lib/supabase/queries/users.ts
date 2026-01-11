import type { TablesUpdate } from "../../../types/database.types.js";
import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

type UserUpdate = TablesUpdate<"users">;

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

  // Filter by role
  if (role === "admin" || role === "member") {
    query = query.eq("role", role);
  }

  // Filter by allow status
  if (allow !== undefined) {
    query = query.eq("allow", allow);
  }

  // Search by email, first_name, or last_name
  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  // Order by created_at descending (newest first)
  query = query.order("created_at", { ascending: false });

  // Apply pagination only if not getting all
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
  // Check if user exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .single();

  if (!existingUser) {
    throw new Error("User not found");
  }

  // If clerk_user_id is being updated, check for conflicts
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
  // Check if user exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .single();

  if (!existingUser) {
    throw new Error("User not found");
  }

  // If clerk_user_id is being updated, check for conflicts
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

