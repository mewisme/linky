import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:streak-exp-bonuses");

export interface StreakExpBonusRecord {
  id: string;
  min_streak: number;
  max_streak: number;
  bonus_multiplier: number;
  created_at: string;
  updated_at: string;
}

type StreakExpBonusInsert = TablesInsert<"streak_exp_bonuses">;
type StreakExpBonusUpdate = TablesUpdate<"streak_exp_bonuses">;

export async function getStreakExpBonusForStreak(streakLength: number): Promise<StreakExpBonusRecord | null> {
  const { data, error } = await supabase
    .from("streak_exp_bonuses")
    .select("*")
    .lte("min_streak", streakLength)
    .gte("max_streak", streakLength)
    .order("bonus_multiplier", { ascending: false })
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching streak EXP bonus: %o", error as Error);
    throw error;
  }

  return data;
}

export async function getAllStreakExpBonuses(): Promise<StreakExpBonusRecord[]> {
  const { data, error } = await supabase
    .from("streak_exp_bonuses")
    .select("*")
    .order("min_streak", { ascending: true });

  if (error) {
    logger.error("Error fetching all streak EXP bonuses: %o", error as Error);
    throw error;
  }

  return data || [];
}

export async function getStreakExpBonusById(id: string): Promise<StreakExpBonusRecord | null> {
  const { data, error } = await supabase
    .from("streak_exp_bonuses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching streak EXP bonus: %o", error as Error);
    throw error;
  }

  return data;
}

export async function createStreakExpBonus(data: StreakExpBonusInsert): Promise<StreakExpBonusRecord> {
  const { data: created, error } = await supabase
    .from("streak_exp_bonuses")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error("Error creating streak EXP bonus: %o", error as Error);
    throw error;
  }

  return created;
}

export async function updateStreakExpBonus(id: string, data: StreakExpBonusUpdate): Promise<StreakExpBonusRecord> {
  const { data: updated, error } = await supabase
    .from("streak_exp_bonuses")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Streak EXP bonus not found");
    }
    logger.error("Error updating streak EXP bonus: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function deleteStreakExpBonus(id: string): Promise<void> {
  const { error } = await supabase
    .from("streak_exp_bonuses")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("Error deleting streak EXP bonus: %o", error as Error);
    throw error;
  }
}
