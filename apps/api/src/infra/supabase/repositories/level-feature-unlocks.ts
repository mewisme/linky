import { createLogger } from "@repo/logger/api";
import { supabase } from "../client.js";
import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

const logger = createLogger("API:Supabase:LevelFeatureUnlocks:Repository");

export interface LevelFeatureUnlockRecord {
  id: string;
  level_required: number;
  feature_key: string;
  feature_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type LevelFeatureUnlockInsert = TablesInsert<"level_feature_unlocks">;
type LevelFeatureUnlockUpdate = TablesUpdate<"level_feature_unlocks">;

export async function getLevelFeatureUnlocksUpToLevel(level: number): Promise<LevelFeatureUnlockRecord[]> {
  const { data, error } = await supabase
    .from("level_feature_unlocks")
    .select("*")
    .lte("level_required", level)
    .order("level_required", { ascending: true })
    .order("feature_key", { ascending: true });

  if (error) {
    logger.error("Error fetching level feature unlocks up to level: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map((record) => ({
    ...record,
    feature_payload: (record.feature_payload || {}) as Record<string, unknown>,
  }));
}

export async function getAllLevelFeatureUnlocks(): Promise<LevelFeatureUnlockRecord[]> {
  const { data, error } = await supabase
    .from("level_feature_unlocks")
    .select("*")
    .order("level_required", { ascending: true })
    .order("feature_key", { ascending: true });

  if (error) {
    logger.error("Error fetching all level feature unlocks: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map((record) => ({
    ...record,
    feature_payload: (record.feature_payload || {}) as Record<string, unknown>,
  }));
}

export async function getLevelFeatureUnlockById(id: string): Promise<LevelFeatureUnlockRecord | null> {
  const { data, error } = await supabase
    .from("level_feature_unlocks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching level feature unlock: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data
    ? {
        ...data,
        feature_payload: (data.feature_payload || {}) as Record<string, unknown>,
      }
    : null;
}

export async function createLevelFeatureUnlock(data: LevelFeatureUnlockInsert): Promise<LevelFeatureUnlockRecord> {
  const { data: created, error } = await supabase
    .from("level_feature_unlocks")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error("Error creating level feature unlock: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  if (!created) {
    throw new Error("Failed to create level feature unlock");
  }

  return {
    ...created,
    feature_payload: (created.feature_payload || {}) as Record<string, unknown>,
  };
}

export async function updateLevelFeatureUnlock(id: string, data: LevelFeatureUnlockUpdate): Promise<LevelFeatureUnlockRecord> {
  const { data: updated, error } = await supabase
    .from("level_feature_unlocks")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Level feature unlock not found");
    }
    logger.error("Error updating level feature unlock: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  if (!updated) {
    throw new Error("Level feature unlock not found");
  }

  return {
    ...updated,
    feature_payload: (updated.feature_payload || {}) as Record<string, unknown>,
  };
}

export async function deleteLevelFeatureUnlock(id: string): Promise<void> {
  const { error } = await supabase
    .from("level_feature_unlocks")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Error deleting level feature unlock: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
