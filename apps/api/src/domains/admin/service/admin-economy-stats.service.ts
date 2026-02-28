import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("admin:service:economy-stats");

export interface EconomyStats {
  totalCoinSupply: number;
  totalCoinsMinted: number;
  totalExpBurned: number;
  dailyMintRate: number;
  dailyBurnRate: number;
}

interface EconomyStatsRow {
  total_coin_supply: number | string;
  total_coins_minted: number | string;
  total_exp_burned: number | string;
  daily_mint_rate: number | string;
  daily_burn_rate: number | string;
}

export async function getEconomyStats(): Promise<EconomyStats> {
  const { data, error } = await supabase.rpc("get_economy_stats");

  if (error) {
    logger.error("Error fetching economy stats: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as EconomyStatsRow) : (data as EconomyStatsRow);
  if (!row) {
    return {
      totalCoinSupply: 0,
      totalCoinsMinted: 0,
      totalExpBurned: 0,
      dailyMintRate: 0,
      dailyBurnRate: 0,
    };
  }

  return {
    totalCoinSupply: Number(row.total_coin_supply ?? 0),
    totalCoinsMinted: Number(row.total_coins_minted ?? 0),
    totalExpBurned: Number(row.total_exp_burned ?? 0),
    dailyMintRate: Number(row.daily_mint_rate ?? 0),
    dailyBurnRate: Number(row.daily_burn_rate ?? 0),
  };
}
