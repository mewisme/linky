import type {
  ClaimWeeklyCheckinResult,
  ClaimWeeklyCheckinRpcRow,
  WeeklyProgress,
} from "@/domains/economy-weekly/types/weekly-checkin.types.js";
import { getWeeklyCheckinRecord } from "@/domains/economy-weekly/repository/weekly-checkin.repository.js";
import { WEEKLY_CHECKIN_REWARDS } from "@/domains/economy-weekly/types/weekly-checkin.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-weekly:service:weekly-checkin");

export class WeeklyCheckinError extends Error {
  constructor(
    message: string,
    public readonly code: "ALREADY_CLAIMED"
  ) {
    super(message);
    this.name = "WeeklyCheckinError";
  }
}

export async function getWeeklyProgress(
  userId: string,
  localDate: string
): Promise<WeeklyProgress> {
  const record = await getWeeklyCheckinRecord(userId);
  const lastCheckinDate = record?.last_checkin_local_date ?? null;
  const streakDay = record?.streak_day ?? 0;
  const totalWeeksCompleted = record?.total_weeks_completed ?? 0;
  const canCheckinToday = lastCheckinDate !== localDate;
  const nextDay = streakDay === 7 ? 1 : streakDay + 1;
  const rewardToday = canCheckinToday ? (WEEKLY_CHECKIN_REWARDS[nextDay] ?? null) : null;

  return {
    streakDay,
    lastCheckinDate,
    rewardToday: rewardToday ?? null,
    canCheckinToday,
    totalWeeksCompleted,
  };
}

function mapRpcRow(row: ClaimWeeklyCheckinRpcRow): ClaimWeeklyCheckinResult {
  return {
    streakDay: row.streak_day,
    reward: row.reward,
    newCoinBalance: row.new_coin_balance,
  };
}

export async function claimWeeklyCheckin(userId: string): Promise<ClaimWeeklyCheckinResult> {
  const { data, error } = await supabase.rpc("claim_weekly_checkin", {
    p_user_id: userId,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("ALREADY_CLAIMED")) {
      throw new WeeklyCheckinError("Already claimed for today", "ALREADY_CLAIMED");
    }
    logger.error("Error claiming weekly checkin: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ClaimWeeklyCheckinRpcRow) : (data as ClaimWeeklyCheckinRpcRow);
  if (!row) {
    logger.error("claim_weekly_checkin RPC returned no row");
    throw new Error("Claim failed");
  }

  return mapRpcRow(row);
}
