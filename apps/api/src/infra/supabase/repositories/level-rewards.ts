import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:level-rewards");

export interface LevelRewardRecord {
  id: string;
  level_required: number;
  reward_type: string;
  reward_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type LevelRewardInsert = TablesInsert<"level_rewards">;
type LevelRewardUpdate = TablesUpdate<"level_rewards">;

export async function getLevelRewardsByLevel(level: number): Promise<LevelRewardRecord[]> {
  const { data, error } = await supabase
    .from("level_rewards")
    .select("*")
    .eq("level_required", level)
    .order("reward_type", { ascending: true });

  if (error) {
    logger.error(error as Error, "Error fetching level rewards by level");
    throw error;
  }

  return (data || []).map((record) => ({
    ...record,
    reward_payload: (record.reward_payload || {}) as Record<string, unknown>,
  }));
}

export async function getLevelRewardsUpToLevel(level: number): Promise<LevelRewardRecord[]> {
  const { data, error } = await supabase
    .from("level_rewards")
    .select("*")
    .lte("level_required", level)
    .order("level_required", { ascending: true })
    .order("reward_type", { ascending: true });

  if (error) {
    logger.error(error as Error, "Error fetching level rewards up to level");
    throw error;
  }

  return (data || []).map((record) => ({
    ...record,
    reward_payload: (record.reward_payload || {}) as Record<string, unknown>,
  }));
}

export async function getAllLevelRewards(): Promise<LevelRewardRecord[]> {
  const { data, error } = await supabase
    .from("level_rewards")
    .select("*")
    .order("level_required", { ascending: true })
    .order("reward_type", { ascending: true });

  if (error) {
    logger.error(error as Error, "Error fetching all level rewards");
    throw error;
  }

  return (data || []).map((record) => ({
    ...record,
    reward_payload: (record.reward_payload || {}) as Record<string, unknown>,
  }));
}

export async function getLevelRewardById(id: string): Promise<LevelRewardRecord | null> {
  const { data, error } = await supabase
    .from("level_rewards")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(error as Error, "Error fetching level reward");
    throw error;
  }

  return data
    ? {
      ...data,
      reward_payload: (data.reward_payload || {}) as Record<string, unknown>,
    }
    : null;
}

export async function createLevelReward(data: LevelRewardInsert): Promise<LevelRewardRecord> {
  const { data: created, error } = await supabase
    .from("level_rewards")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error(error as Error, "Error creating level reward");
    throw error;
  }

  if (!created) {
    throw new Error("Failed to create level reward");
  }

  return {
    ...created,
    reward_payload: (created.reward_payload || {}) as Record<string, unknown>,
  };
}

export async function updateLevelReward(id: string, data: LevelRewardUpdate): Promise<LevelRewardRecord> {
  const { data: updated, error } = await supabase
    .from("level_rewards")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Level reward not found");
    }
    logger.error(error as Error, "Error updating level reward");
    throw error;
  }

  if (!updated) {
    throw new Error("Level reward not found");
  }

  return {
    ...updated,
    reward_payload: (updated.reward_payload || {}) as Record<string, unknown>,
  };
}

export async function deleteLevelReward(id: string): Promise<void> {
  const { error } = await supabase
    .from("level_rewards")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error(error as Error, "Error deleting level reward");
    throw error;
  }
}
