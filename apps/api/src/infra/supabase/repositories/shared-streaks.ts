import { createLogger } from "@repo/logger/api";
import { supabase } from "../client.js";
import { computeNewSharedStreakCount } from "./shared-streak-logic.js";

const logger = createLogger("API:Supabase:SharedStreaks:Repository");

export interface SharedStreakRecord {
  user_a: string;
  user_b: string;
  current_streak: number;
  longest_streak: number;
  last_valid_date: string | null;
  updated_at: string;
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function upsertSharedStreakForPair(
  userA: string,
  userB: string,
  callerLocalDateStr: string,
): Promise<void> {
  const [ua, ub] = orderedPair(userA, userB);
  const { data: existing, error: fetchErr } = await supabase
    .from("shared_streaks")
    .select("current_streak, longest_streak, last_valid_date")
    .eq("user_a", ua)
    .eq("user_b", ub)
    .maybeSingle();

  if (fetchErr) {
    logger.error("Error fetching shared streak: %o", fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)));
    throw fetchErr;
  }

  const now = new Date().toISOString();
  if (!existing) {
    const { error: insertErr } = await supabase.from("shared_streaks").insert({
      user_a: ua,
      user_b: ub,
      current_streak: 1,
      longest_streak: 1,
      last_valid_date: callerLocalDateStr,
      updated_at: now,
    });
    if (insertErr) {
      logger.error("Error inserting shared streak: %o", insertErr instanceof Error ? insertErr : new Error(String(insertErr)));
      throw insertErr;
    }
    return;
  }

  if (existing.last_valid_date === callerLocalDateStr) return;

  const { newCurrent, newLongest } = computeNewSharedStreakCount(
    {
      last_valid_date: existing.last_valid_date,
      current_streak: existing.current_streak,
      longest_streak: existing.longest_streak,
    },
    callerLocalDateStr,
  );

  const { error: updateErr } = await supabase
    .from("shared_streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_valid_date: callerLocalDateStr,
      updated_at: now,
    })
    .eq("user_a", ua)
    .eq("user_b", ub);

  if (updateErr) {
    logger.error("Error updating shared streak: %o", updateErr instanceof Error ? updateErr : new Error(String(updateErr)));
    throw updateErr;
  }
}

export async function getSharedStreaksForUser(userId: string): Promise<SharedStreakRecord[]> {
  const { data, error } = await supabase
    .from("shared_streaks")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("last_valid_date", { ascending: false });

  if (error) {
    logger.error("Error fetching shared streaks for user: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
  return data ?? [];
}
