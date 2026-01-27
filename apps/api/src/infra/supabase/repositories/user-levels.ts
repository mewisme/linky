import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:UserLevels:Repository");

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
    logger.error("Error incrementing user exp: %o", error instanceof Error ? error : new Error(String(error)));
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
    logger.error("Error fetching user level: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}
