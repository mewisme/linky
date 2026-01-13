import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";
import type { TablesInsert, TablesUpdate } from "../../../types/database.types.js";

export interface GetInterestTagsOptions {
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get interest tags with optional filtering
 */
export async function getInterestTags(options: GetInterestTagsOptions = {}) {
  const { category, isActive = true, search, limit = 100, offset = 0 } = options;

  let query = supabase
    .from("interest_tags")
    .select("*", { count: "exact" });

  // Filter by active status
  if (isActive !== undefined) {
    query = query.eq("is_active", isActive);
  }

  // Filter by category
  if (category) {
    query = query.eq("category", category);
  }

  // Search by name or description
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Order by name
  query = query.order("name", { ascending: true });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching interest tags:", error.message);
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get interest tag by ID
 */
export async function getInterestTagById(id: string) {
  const { data, error } = await supabase
    .from("interest_tags")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Error fetching interest tag:", error.message);
    throw error;
  }

  return data;
}

/**
 * Get multiple interest tags by IDs (for validation)
 */
export async function getInterestTagsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("interest_tags")
    .select("*")
    .in("id", ids)
    .eq("is_active", true); // Only get active tags

  if (error) {
    logger.error("Error fetching interest tags by IDs:", error.message);
    throw error;
  }

  return data || [];
}

type InterestTagInsert = TablesInsert<"interest_tags">;
type InterestTagUpdate = TablesUpdate<"interest_tags">;

/**
 * Create a new interest tag (admin only)
 */
export async function createInterestTag(data: InterestTagInsert) {
  const { data: created, error } = await supabase
    .from("interest_tags")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error("Error creating interest tag:", error.message);
    throw error;
  }

  return created;
}

/**
 * Update an interest tag (admin only)
 */
export async function updateInterestTag(id: string, data: InterestTagUpdate) {
  const { data: updated, error } = await supabase
    .from("interest_tags")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Interest tag not found");
    }
    logger.error("Error updating interest tag:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Delete an interest tag (admin only)
 * Note: This is a soft delete by setting is_active to false
 * For hard delete, use deleteInterestTagHard
 */
export async function deleteInterestTag(id: string) {
  const { data: updated, error } = await supabase
    .from("interest_tags")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Interest tag not found");
    }
    logger.error("Error deleting interest tag:", error.message);
    throw error;
  }

  return updated;
}

/**
 * Hard delete an interest tag (admin only)
 * WARNING: This permanently deletes the tag. Use with caution.
 */
export async function deleteInterestTagHard(id: string) {
  const { error } = await supabase
    .from("interest_tags")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Error hard deleting interest tag:", error.message);
    throw error;
  }

  return { success: true };
}
