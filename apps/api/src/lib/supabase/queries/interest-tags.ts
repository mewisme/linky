import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

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
