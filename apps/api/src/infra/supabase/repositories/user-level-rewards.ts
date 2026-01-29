import type { TablesInsert } from "../../../types/database/supabase.types.js";
import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("infra:supabase:repositories:user-level-rewards");

export interface UserLevelRewardRecord {
  id: string;
  user_id: string;
  level_reward_id: string;
  granted_at: string;
}

type UserLevelRewardInsert = TablesInsert<"user_level_rewards">;

export async function getUserLevelRewards(userId: string): Promise<UserLevelRewardRecord[]> {
  const { data, error } = await supabase
    .from("user_level_rewards")
    .select("*")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false });

  if (error) {
    logger.error("Error fetching user level rewards: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data || [];
}

export async function getUserLevelRewardIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_level_rewards")
    .select("level_reward_id")
    .eq("user_id", userId);

  if (error) {
    logger.error("Error fetching user level reward IDs: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map((record) => record.level_reward_id);
}

export async function hasUserLevelReward(userId: string, levelRewardId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_level_rewards")
    .select("id")
    .eq("user_id", userId)
    .eq("level_reward_id", levelRewardId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    logger.error("Error checking user level reward: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data !== null;
}

export async function grantUserLevelReward(data: UserLevelRewardInsert): Promise<UserLevelRewardRecord> {
  const { data: created, error } = await supabase
    .from("user_level_rewards")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      logger.warn("User level reward already granted: %s, %s", data.user_id, data.level_reward_id);
      const existing = await getUserLevelRewards(data.user_id);
      const reward = existing.find((r) => r.level_reward_id === data.level_reward_id);
      if (reward) {
        return reward;
      }
    }
    logger.error("Error granting user level reward: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return created;
}

export async function grantUserLevelRewards(userId: string, levelRewardIds: string[]): Promise<UserLevelRewardRecord[]> {
  if (levelRewardIds.length === 0) {
    return [];
  }

  const existingIds = await getUserLevelRewardIds(userId);
  const newIds = levelRewardIds.filter((id) => !existingIds.includes(id));

  if (newIds.length === 0) {
    return [];
  }

  const inserts: UserLevelRewardInsert[] = newIds.map((levelRewardId) => ({
    user_id: userId,
    level_reward_id: levelRewardId,
  }));

  const { data, error } = await supabase
    .from("user_level_rewards")
    .insert(inserts)
    .select();

  if (error) {
    logger.error("Error granting user level rewards: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data || [];
}
