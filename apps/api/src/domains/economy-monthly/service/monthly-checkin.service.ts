import type {
  ClaimMonthlyBuybackResult,
  ClaimMonthlyBuybackRpcRow,
  ClaimMonthlyCheckinResult,
  ClaimMonthlyCheckinRpcRow,
  MonthlyProgress,
} from "@/domains/economy-monthly/types/monthly-checkin.types.js";
import {
  getBuybackCost,
  getDaysInMonth,
} from "@/domains/economy-monthly/types/monthly-checkin.types.js";

import { createLogger } from "@/utils/logger.js";
import { getMonthlyCheckinRecord } from "@/domains/economy-monthly/repository/monthly-checkin.repository.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-monthly:service:monthly-checkin");

export class MonthlyCheckinError extends Error {
  constructor(
    message: string,
    public readonly code: "ALREADY_CLAIMED" | "INVALID_DAY" | "FUTURE_DAY" | "BUYBACK_FUTURE_OR_TODAY" | "INSUFFICIENT_EXP" | "NO_MONTHLY_RECORD"
  ) {
    super(message);
    this.name = "MonthlyCheckinError";
  }
}

export async function getMonthlyProgress(
  userId: string,
  year: number,
  month: number,
  todayDay: number
): Promise<MonthlyProgress> {
  const record = await getMonthlyCheckinRecord(userId, year, month);
  const claimedDays = record?.claimed_days ?? [];
  const buybackCount = record?.buyback_count ?? 0;
  const totalClaimed = claimedDays.length;
  const availableToday = !claimedDays.includes(todayDay);
  const buybackCostPreview = getBuybackCost(buybackCount);

  return {
    year,
    month,
    claimedDays: [...claimedDays].sort((a, b) => a - b),
    availableToday,
    buybackCostPreview,
    totalClaimed,
  };
}

function mapCheckinRpcRow(row: ClaimMonthlyCheckinRpcRow): ClaimMonthlyCheckinResult {
  return {
    reward: row.reward,
    newCoinBalance: row.new_coin_balance,
  };
}

function mapBuybackRpcRow(row: ClaimMonthlyBuybackRpcRow): ClaimMonthlyBuybackResult {
  return {
    expSpent: row.exp_spent,
    reward: row.reward,
    newCoinBalance: row.new_coin_balance,
  };
}

export async function claimMonthlyCheckin(
  userId: string,
  day: number
): Promise<ClaimMonthlyCheckinResult> {
  const { data, error } = await supabase.rpc("claim_monthly_checkin", {
    p_user_id: userId,
    p_day: day,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("ALREADY_CLAIMED")) throw new MonthlyCheckinError("Day already claimed", "ALREADY_CLAIMED");
    if (msg.includes("INVALID_DAY")) throw new MonthlyCheckinError("Invalid day for month", "INVALID_DAY");
    if (msg.includes("FUTURE_DAY")) throw new MonthlyCheckinError("Cannot claim future day", "FUTURE_DAY");
    logger.error(error as Error, "Error claiming monthly checkin");
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ClaimMonthlyCheckinRpcRow) : (data as ClaimMonthlyCheckinRpcRow);
  if (!row) {
    logger.error("claim_monthly_checkin RPC returned no row");
    throw new Error("Claim failed");
  }
  return mapCheckinRpcRow(row);
}

export async function claimMonthlyBuyback(
  userId: string,
  day: number
): Promise<ClaimMonthlyBuybackResult> {
  const { data, error } = await supabase.rpc("claim_monthly_buyback", {
    p_user_id: userId,
    p_day: day,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("ALREADY_CLAIMED")) throw new MonthlyCheckinError("Day already claimed", "ALREADY_CLAIMED");
    if (msg.includes("INVALID_DAY")) throw new MonthlyCheckinError("Invalid day for month", "INVALID_DAY");
    if (msg.includes("BUYBACK_FUTURE_OR_TODAY")) throw new MonthlyCheckinError("Buyback only for past days", "BUYBACK_FUTURE_OR_TODAY");
    if (msg.includes("INSUFFICIENT_EXP")) throw new MonthlyCheckinError("Insufficient EXP for buyback", "INSUFFICIENT_EXP");
    if (msg.includes("NO_MONTHLY_RECORD")) throw new MonthlyCheckinError("No monthly record", "NO_MONTHLY_RECORD");
    logger.error(error as Error, "Error claiming monthly buyback");
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ClaimMonthlyBuybackRpcRow) : (data as ClaimMonthlyBuybackRpcRow);
  if (!row) {
    logger.error("claim_monthly_buyback RPC returned no row");
    throw new Error("Buyback failed");
  }
  return mapBuybackRpcRow(row);
}
