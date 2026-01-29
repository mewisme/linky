import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:InterestTags:Repository");

export interface GetInterestTagsOptions {
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getInterestTags(options: GetInterestTagsOptions = {}) {
  const { category, isActive, search, limit = 100, offset = 0 } = options;

  let query = supabase
    .from("interest_tags")
    .select("*", { count: "exact" });

  if (isActive !== undefined) {
    query = query.eq("is_active", isActive);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = query.order("name", { ascending: true });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching interest tags: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

export async function getInterestTagById(id: string) {
  const { data, error } = await supabase
    .from("interest_tags")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching interest tag: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getInterestTagsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("interest_tags")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    logger.error("Error fetching interest tags by IDs: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data || [];
}

export async function getInterestTagNamesByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("interest_tags")
    .select("id, name")
    .in("id", ids);

  if (error) {
    logger.error("Error fetching interest tag names: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data || [];
}

type InterestTagInsert = TablesInsert<"interest_tags">;
type InterestTagUpdate = TablesUpdate<"interest_tags">;

export async function createInterestTag(data: InterestTagInsert) {
  const { data: created, error } = await supabase
    .from("interest_tags")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error("Error creating interest tag: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return created;
}

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
    logger.error("Error updating interest tag: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return updated;
}

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
    logger.error("Error deleting interest tag: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return updated;
}

export async function deleteInterestTagHard(id: string) {
  const { error } = await supabase
    .from("interest_tags")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Error hard deleting interest tag: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { success: true };
}

