import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("infra:supabase:repositories:user-exp-daily");

export interface UserExpDailyRecord {
  id: string;
  user_id: string;
  date: string;
  exp_seconds: number;
  created_at: string;
  updated_at: string;
}

export async function incrementUserExpDaily(
  userId: string,
  date: string,
  expSeconds: number,
): Promise<void> {
  if (expSeconds <= 0) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logger.error("Invalid date format: %s", date);
    throw new Error("date must be YYYY-MM-DD");
  }

  const { error } = await supabase.rpc("increment_user_exp_daily", {
    p_user_id: userId,
    p_date: date,
    p_exp_seconds: expSeconds,
  });

  if (error) {
    logger.error("Error incrementing user exp daily: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getUserExpDaily(
  userId: string,
  date: string,
): Promise<number> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 0;
  }

  const { data, error } = await supabase
    .from("user_exp_daily")
    .select("exp_seconds")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return 0;
    }
    logger.error("Error fetching user exp daily: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data?.exp_seconds ?? 0;
}
