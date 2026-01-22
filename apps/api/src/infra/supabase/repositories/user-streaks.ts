import { createLogger } from "@repo/logger/api";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:UserStreaks:Repository");

export interface UserStreakDayRecord {
  id: string;
  user_id: string;
  date: string;
  total_call_seconds: number;
  is_valid: boolean;
  created_at: string;
}

export interface UserStreakRecord {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_valid_date: string | null;
  updated_at: string;
}

export interface UpsertUserStreakDayResult {
  firstTimeValid: boolean;
  currentStreak: number;
}

export async function upsertUserStreakDay(
  userId: string,
  date: Date,
  totalCallSeconds: number,
): Promise<UpsertUserStreakDayResult | null> {
  if (totalCallSeconds <= 0) {
    return null;
  }

  const dateStr = date.toISOString().split("T")[0] || "";

  const { data, error } = await supabase.rpc("upsert_user_streak_day", {
    p_user_id: userId,
    p_date: dateStr,
    p_total_call_seconds: totalCallSeconds,
  });

  if (error) {
    logger.error("Error upserting user streak day: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row || typeof row.first_time_valid !== "boolean") {
    return null;
  }

  return {
    firstTimeValid: row.first_time_valid,
    currentStreak: typeof row.current_streak === "number" ? row.current_streak : 0,
  };
}

export async function getUserStreak(userId: string): Promise<UserStreakRecord | null> {
  const { data, error } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user streak: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getUserStreakDays(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ data: UserStreakDayRecord[]; count: number | null }> {
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from("user_streak_days")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("Error fetching user streak days: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count };
}
