import { createLogger } from "@repo/logger";
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
  last_continuation_used_freeze?: boolean;
  updated_at: string;
}

export interface UpsertUserStreakDayResult {
  firstTimeValid: boolean;
  currentStreak: number;
}

export async function upsertUserStreakDay(
  userId: string,
  dateStr: string,
  totalCallSeconds: number,
): Promise<UpsertUserStreakDayResult | null> {
  if (totalCallSeconds <= 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("dateStr must be YYYY-MM-DD");
  }

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

export async function getStreakDayByUserAndDate(
  userId: string,
  dateStr: string,
): Promise<{ is_valid: boolean } | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const { data, error } = await supabase
    .from("user_streak_days")
    .select("is_valid")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .maybeSingle();
  if (error) {
    logger.error("Error fetching streak day by date: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
  return data;
}

export async function clearLastContinuationUsedFreeze(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_streaks")
    .update({ last_continuation_used_freeze: false })
    .eq("user_id", userId);
  if (error) {
    logger.error("Error clearing last_continuation_used_freeze: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
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

export async function getUserStreakDaysByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<UserStreakDayRecord[]> {
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const startDateStr = startDate.toISOString().split("T")[0] || "";
  const endDateStr = endDate.toISOString().split("T")[0] || "";

  const { data, error } = await supabase
    .from("user_streak_days")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDateStr)
    .lte("date", endDateStr)
    .order("date", { ascending: true });

  if (error) {
    logger.error("Error fetching user streak days by month: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data || [];
}
