import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:user-streak-freeze");

export interface UserStreakFreezeInventoryRecord {
  user_id: string;
  available_count: number;
  total_used: number;
  updated_at: string;
}

export async function getFreezeInventory(userId: string): Promise<UserStreakFreezeInventoryRecord | null> {
  const { data, error } = await supabase
    .from("user_streak_freeze_inventory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error(error as Error, "Error fetching freeze inventory");
    throw error;
  }
  return data;
}

export async function getOrCreateFreezeInventory(userId: string): Promise<UserStreakFreezeInventoryRecord> {
  const existing = await getFreezeInventory(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("user_streak_freeze_inventory")
    .insert({ user_id: userId, available_count: 0, total_used: 0 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await getFreezeInventory(userId);
      if (retry) return retry;
    }
    logger.error(error as Error, "Error creating freeze inventory");
    throw error;
  }
  return data;
}

export async function addAvailableFreezes(userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  const inv = await getOrCreateFreezeInventory(userId);
  const { error } = await supabase
    .from("user_streak_freeze_inventory")
    .update({ available_count: inv.available_count + count, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    logger.error(error as Error, "Error adding available freezes");
    throw error;
  }
}

export async function consumeFreeze(userId: string): Promise<boolean> {
  const inv = await getFreezeInventory(userId);
  if (!inv || inv.available_count < 1) return false;
  const { error } = await supabase
    .from("user_streak_freeze_inventory")
    .update({
      available_count: inv.available_count - 1,
      total_used: inv.total_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .gte("available_count", 1);
  if (error) {
    logger.error(error as Error, "Error consuming freeze");
    throw error;
  }
  return true;
}

export async function getGrantedFreezeUnlockIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_streak_freeze_grants")
    .select("level_feature_unlock_id")
    .eq("user_id", userId);
  if (error) {
    logger.error(error as Error, "Error fetching freeze grants");
    throw error;
  }
  return (data ?? []).map((r) => r.level_feature_unlock_id);
}

export async function insertFreezeGrant(userId: string, levelFeatureUnlockId: string): Promise<void> {
  const { error } = await supabase.from("user_streak_freeze_grants").insert({
    user_id: userId,
    level_feature_unlock_id: levelFeatureUnlockId,
  });
  if (error) {
    if (error.code === "23505") return;
    logger.error(error as Error, "Error inserting freeze grant");
    throw error;
  }
}

export async function prepareStreakFreeze(userId: string, gapDate: string): Promise<void> {
  const { error } = await supabase.rpc("prepare_streak_freeze", {
    p_user_id: userId,
    p_gap_date: gapDate,
  });
  if (error) {
    logger.error(error as Error, "Error preparing streak freeze");
    throw error;
  }
}
