import { createLogger } from "@ws/logger";
import type { Json } from "@/types/database/supabase.types.js";
import { supabase } from "@/infra/supabase/client.js";
import {
  getEconomyConfigValue,
  setEconomyConfigValue,
} from "@/infra/supabase/repositories/economy-config.js";

const logger = createLogger("contexts:economy-stabilizer");

const CONVERSION_BONUS_FLOOR = 0.5;
const COSMETIC_PRICE_CAP = 2.0;
const SEASONAL_DECAY_CAP = 0.8;
const MINT_BURN_RATIO_THRESHOLD = 1.3;
const TOP_10_RATIO_THRESHOLD = 0.65;
const CONSECUTIVE_DAYS_REQUIRED = 7;

type EconomyHealthStatus =
  | "stable"
  | "inflation_risk"
  | "deflation_risk"
  | "whale_dominance";

interface MetricsRow {
  date: string;
  total_coin_supply: number;
  total_vault_supply: number;
  total_coin_minted: number;
  total_coin_burned: number;
  total_exp_generated?: number;
  total_exp_converted?: number;
  active_users_count?: number;
  avg_coin_per_user?: number | null;
  top_10_percent_ratio?: number | null;
}

interface StabilizerAction {
  key: string;
  previousValue: number;
  newValue: number;
}

export async function runStabilizer(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: rows, error: metricsError } = await supabase
    .from("economy_metrics_daily")
    .select(
      "date, total_coin_supply, total_vault_supply, total_coin_minted, total_coin_burned, total_exp_generated, total_exp_converted, active_users_count, avg_coin_per_user, top_10_percent_ratio"
    )
    .order("date", { ascending: false })
    .limit(8);

  if (metricsError) {
    logger.error("Failed to fetch economy_metrics_daily: %o", metricsError as Error);
    throw metricsError;
  }

  const orderedRows = (rows ?? []) as MetricsRow[];
  if (orderedRows.length === 0) {
    logger.warn("No economy metrics rows; skipping stabilizer");
    return;
  }

  const latest = orderedRows[0] as MetricsRow;
  const actionsTaken: StabilizerAction[] = [];
  const stabilizationEnabled =
    (await getEconomyConfigValue<boolean>("stabilization_enabled")) ?? true;

  if (stabilizationEnabled) {
    const sevenDayMintBurnDeltas = computeDailyDeltas(orderedRows);
    const inflationRuleTriggered =
      sevenDayMintBurnDeltas.length >= CONSECUTIVE_DAYS_REQUIRED &&
      sevenDayMintBurnDeltas.every(
        (d) => d.mint > d.burn * MINT_BURN_RATIO_THRESHOLD
      );

    if (inflationRuleTriggered) {
      const current = (await getEconomyConfigValue<number>("conversion_bonus_multiplier")) ?? 1.0;
      const next = Math.max(CONVERSION_BONUS_FLOOR, current - 0.02);
      if (next !== current) {
        await setEconomyConfigValue("conversion_bonus_multiplier", next);
        actionsTaken.push({ key: "conversion_bonus_multiplier", previousValue: current, newValue: next });
      }
    }

    const avgCap = (await getEconomyConfigValue<number>("avg_coin_per_user_cap")) ?? 500;
    const avgCoin = latest.avg_coin_per_user ?? 0;
    if (avgCoin > avgCap) {
      const current = (await getEconomyConfigValue<number>("cosmetic_price_multiplier")) ?? 1.0;
      const next = Math.min(COSMETIC_PRICE_CAP, current + 0.05);
      if (next !== current) {
        await setEconomyConfigValue("cosmetic_price_multiplier", next);
        actionsTaken.push({ key: "cosmetic_price_multiplier", previousValue: current, newValue: next });
      }
    }

    const top10 = latest.top_10_percent_ratio ?? 0;
    if (top10 > TOP_10_RATIO_THRESHOLD) {
      const current = (await getEconomyConfigValue<number>("seasonal_decay_rate")) ?? 0.3;
      const next = Math.min(SEASONAL_DECAY_CAP, current + 0.05);
      if (next !== current) {
        await setEconomyConfigValue("seasonal_decay_rate", next);
        actionsTaken.push({ key: "seasonal_decay_rate", previousValue: current, newValue: next });
      }
    }
  }

  const healthStatus = classifyHealth(orderedRows);
  const metricsSnapshot = {
    total_coin_supply: latest.total_coin_supply,
    total_vault_supply: latest.total_vault_supply,
    total_coin_minted: latest.total_coin_minted,
    total_coin_burned: latest.total_coin_burned,
    total_exp_generated: latest.total_exp_generated,
    total_exp_converted: latest.total_exp_converted,
    active_users_count: latest.active_users_count,
    avg_coin_per_user: latest.avg_coin_per_user,
    top_10_percent_ratio: latest.top_10_percent_ratio,
    date: latest.date,
  };

  const { error: reportError } = await supabase.from("economy_health_reports").upsert(
    {
      date: today,
      health_status: healthStatus,
      metrics_snapshot: metricsSnapshot as Json,
      actions_taken: actionsTaken as unknown as Json,
    },
    { onConflict: "date" }
  );

  if (reportError) {
    logger.error("Failed to upsert economy_health_reports: %o", reportError as Error);
    throw reportError;
  }

  if (actionsTaken.length > 0) {
    logger.info("Stabilizer applied %d action(s): %o", actionsTaken.length, actionsTaken);
  }
}

function computeDailyDeltas(rows: MetricsRow[]): { mint: number; burn: number }[] {
  const deltas: { mint: number; burn: number }[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const curr = rows[i];
    const prev = rows[i + 1];
    if (curr == null || prev == null) continue;
    deltas.push({
      mint: Number(curr.total_coin_minted) - Number(prev.total_coin_minted),
      burn: Number(curr.total_coin_burned) - Number(prev.total_coin_burned),
    });
  }
  return deltas;
}

function classifyHealth(rows: MetricsRow[]): EconomyHealthStatus {
  const latest = rows[0];
  if (latest == null) return "stable";
  const top10 = latest.top_10_percent_ratio ?? 0;
  if (top10 > TOP_10_RATIO_THRESHOLD) return "whale_dominance";

  const deltas = computeDailyDeltas(rows);
  const d = deltas[0];
  if (d == null) return "stable";
  const mint = d.mint;
  const burn = d.burn;
  if (burn <= 0) return mint > 0 ? "inflation_risk" : "stable";
  if (mint > burn * MINT_BURN_RATIO_THRESHOLD) return "inflation_risk";
  if (burn > mint * MINT_BURN_RATIO_THRESHOLD) return "deflation_risk";
  return "stable";
}
