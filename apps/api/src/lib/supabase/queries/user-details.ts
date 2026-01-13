import type { TablesInsert, TablesUpdate } from "../../../types/database.types.js";
import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

type UserDetailsInsert = TablesInsert<"user_details">;
type UserDetailsUpdate = TablesUpdate<"user_details">;

/**
 * Get user details by user_id
 */
export async function getUserDetailsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("user_details")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Error fetching user details:", error.message);
    throw error;
  }

  return data;
}

/**
 * Get user details with expanded interest tags (using view)
 */
export async function getUserDetailsWithTags(userId: string) {
  const { data, error } = await supabase
    .from("user_details_with_tags")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Error fetching user details with tags:", error.message);
    throw error;
  }

  return data;
}

/**
 * Create user details
 */
export async function createUserDetails(userId: string, data: Omit<UserDetailsInsert, "user_id">) {
  const { data: created, error } = await supabase
    .from("user_details")
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating user details:", error.message);
    throw error;
  }

  return created;
}

/**
 * Update user details (full update)
 */
export async function updateUserDetails(userId: string, data: UserDetailsUpdate) {
  // Check if user details exists
  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    throw new Error("User details not found");
  }

  const { data: updated, error } = await supabase
    .from("user_details")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating user details:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Partially update user details
 */
export async function patchUserDetails(userId: string, data: Partial<UserDetailsUpdate>) {
  // Check if user details exists
  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    throw new Error("User details not found");
  }

  const { data: updated, error } = await supabase
    .from("user_details")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error patching user details:", error.message);
    throw error;
  }

  return updated;
}
