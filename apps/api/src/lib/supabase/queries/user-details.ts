import type { TablesInsert, TablesUpdate } from "../../../types/database.types.js";
import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";
import { getInterestTagsByIds } from "./interest-tags.js";

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
    .from("user_details_expanded")
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

/**
 * Get complete user profile with details and expanded interest tags (using users_with_details view)
 */
export async function getUserWithDetails(userId: string) {
  const { data, error } = await supabase
    .from("users_with_details")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Error fetching user with details:", error.message);
    throw error;
  }

  return data;
}

/**
 * Add interest tags to user details
 * @param userId - User ID
 * @param tagIds - Array of interest tag IDs to add
 * @returns Updated user details
 */
export async function addInterestTags(userId: string, tagIds: string[]) {
  if (!tagIds || tagIds.length === 0) {
    throw new Error("Tag IDs array cannot be empty");
  }

  // Validate that all tags exist and are active
  const validTags = await getInterestTagsByIds(tagIds);
  if (validTags.length !== tagIds.length) {
    const foundIds = validTags.map((tag) => tag.id);
    const missingIds = tagIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Invalid or inactive tag IDs: ${missingIds.join(", ")}`
    );
  }

  // Get current user details
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  // Get current tags (handle null case)
  const currentTags = existing.interest_tags || [];

  // Combine current tags with new tags, removing duplicates
  const updatedTags = Array.from(
    new Set([...currentTags, ...tagIds])
  );

  // Update user details
  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: updatedTags })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error adding interest tags:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Remove interest tags from user details
 * @param userId - User ID
 * @param tagIds - Array of interest tag IDs to remove
 * @returns Updated user details
 */
export async function removeInterestTags(userId: string, tagIds: string[]) {
  if (!tagIds || tagIds.length === 0) {
    throw new Error("Tag IDs array cannot be empty");
  }

  // Get current user details
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  // Get current tags (handle null case)
  const currentTags = existing.interest_tags || [];

  // Remove specified tags
  const updatedTags = currentTags.filter((tagId) => !tagIds.includes(tagId));

  // Update user details
  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: updatedTags.length > 0 ? updatedTags : null })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error removing interest tags:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Replace all interest tags in user details
 * @param userId - User ID
 * @param tagIds - Array of interest tag IDs to set (can be empty array to clear all)
 * @returns Updated user details
 */
export async function replaceInterestTags(userId: string, tagIds: string[]) {
  // Get current user details to ensure it exists
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  // If empty array, clear all tags
  if (tagIds.length === 0) {
    return await clearInterestTags(userId);
  }

  // Validate that all tags exist and are active
  const validTags = await getInterestTagsByIds(tagIds);
  if (validTags.length !== tagIds.length) {
    const foundIds = validTags.map((tag) => tag.id);
    const missingIds = tagIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Invalid or inactive tag IDs: ${missingIds.join(", ")}`
    );
  }

  // Remove duplicates from input
  const uniqueTags = Array.from(new Set(tagIds));

  // Update user details
  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: uniqueTags })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error replacing interest tags:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Clear all interest tags from user details
 * @param userId - User ID
 * @returns Updated user details
 */
export async function clearInterestTags(userId: string) {
  // Get current user details to ensure it exists
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  // Update user details to set interest_tags to null
  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: null })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error clearing interest tags:", error.message);
    throw error;
  }

  return updated;
}
