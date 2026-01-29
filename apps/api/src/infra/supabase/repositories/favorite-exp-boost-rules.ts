import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("infra:supabase:repositories:favorite-exp-boost-rules");

export interface FavoriteExpBoostRulesRecord {
  id: string;
  one_way_multiplier: number;
  mutual_multiplier: number;
  created_at: string;
  updated_at: string;
}

export async function getActiveFavoriteExpBoostRules(): Promise<FavoriteExpBoostRulesRecord | null> {
  const { data, error } = await supabase
    .from("favorite_exp_boost_rules")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error(
      "Error fetching favorite EXP boost rules: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
  return data;
}

export async function getAllFavoriteExpBoostRules(): Promise<FavoriteExpBoostRulesRecord[]> {
  const { data, error } = await supabase
    .from("favorite_exp_boost_rules")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    logger.error(
      "Error fetching all favorite EXP boost rules: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
  return data ?? [];
}

export async function getFavoriteExpBoostRulesById(id: string): Promise<FavoriteExpBoostRulesRecord | null> {
  const { data, error } = await supabase
    .from("favorite_exp_boost_rules")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error(
      "Error fetching favorite EXP boost rules by id: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
  return data;
}

export async function createFavoriteExpBoostRules(record: {
  one_way_multiplier: number;
  mutual_multiplier: number;
}): Promise<FavoriteExpBoostRulesRecord> {
  const { data, error } = await supabase
    .from("favorite_exp_boost_rules")
    .insert(record)
    .select()
    .single();

  if (error) {
    logger.error(
      "Error creating favorite EXP boost rules: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
  return data;
}

export async function updateFavoriteExpBoostRules(
  id: string,
  record: { one_way_multiplier?: number; mutual_multiplier?: number },
): Promise<FavoriteExpBoostRulesRecord> {
  const { data, error } = await supabase
    .from("favorite_exp_boost_rules")
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error(
      "Error updating favorite EXP boost rules: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
  return data;
}

export async function deleteFavoriteExpBoostRules(id: string): Promise<void> {
  const { error } = await supabase.from("favorite_exp_boost_rules").delete().eq("id", id);
  if (error) {
    logger.error(
      "Error deleting favorite EXP boost rules: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
