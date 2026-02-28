import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:user-levels");

export interface UserLevelRecord {
  id: string;
  user_id: string;
  total_exp_seconds: number;
  created_at: string;
  updated_at: string;
}

export async function incrementUserExp(userId: string, seconds: number): Promise<void> {
  if (seconds <= 0) {
    return;
  }

  const { error } = await supabase.rpc("increment_user_exp", {
    p_user_id: userId,
    p_seconds: seconds,
  });

  if (error) {
    logger.error(error as Error, "Error incrementing user exp");
    throw error;
  }
}

export async function getUserLevel(userId: string): Promise<UserLevelRecord | null> {
  const { data, error } = await supabase
    .from("user_levels")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(error as Error, "Error fetching user level");
    throw error;
  }

  return data;
}

export async function getUserLevelsByUserIds(
  userIds: string[]
): Promise<Array<{ user_id: string; total_exp_seconds: number }>> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("user_levels")
    .select("user_id, total_exp_seconds")
    .in("user_id", userIds);

  if (error) {
    logger.error(error as Error, "Error fetching user levels batch");
    throw error;
  }

  return data || [];
}
