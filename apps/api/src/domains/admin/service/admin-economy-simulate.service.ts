import { getEconomyConfigValue } from "@/infra/supabase/repositories/economy-config.js";

export interface SimulateEconomyParams {
  days: number;
  avgExpPerUser: number;
  userCount: number;
}

export interface SimulateEconomyResult {
  projected_coin_supply: number;
  projected_mint_rate: number;
  projected_burn_rate: number;
  inflation_risk_score: number;
}

const BASE_COINS_PER_100_EXP = 1;
const DEFAULT_CONVERSION_BONUS = 1.0;
const DEFAULT_MILESTONE_MULTIPLIER = 1.0;
const DEFAULT_COSMETIC_MULTIPLIER = 1.0;
const BASELINE_COIN_TARGET = 500;
const ESTIMATED_DAILY_MILESTONE_COINS_PER_USER = 4;
const ESTIMATED_BURN_RATIO = 0.35;

export async function simulateEconomy(
  params: SimulateEconomyParams
): Promise<SimulateEconomyResult> {
  const { days, avgExpPerUser, userCount } = params;
  const conversionBonus =
    (await getEconomyConfigValue<number>("conversion_bonus_multiplier")) ?? DEFAULT_CONVERSION_BONUS;
  const milestoneMultiplier =
    (await getEconomyConfigValue<number>("milestone_reward_multiplier")) ?? DEFAULT_MILESTONE_MULTIPLIER;
  const cosmeticMultiplier =
    (await getEconomyConfigValue<number>("cosmetic_price_multiplier")) ?? DEFAULT_COSMETIC_MULTIPLIER;

  const bonusPct =
    avgExpPerUser >= 10000 ? 15 : avgExpPerUser >= 5000 ? 10 : avgExpPerUser >= 1000 ? 5 : 0;
  const expConvertedPerUserPerDay = Math.min(avgExpPerUser * 0.2, 10000);
  const baseCoins = Math.floor(expConvertedPerUserPerDay / 100);
  const bonusCoins = Math.floor((baseCoins * bonusPct) / 100 * conversionBonus);
  const conversionCoinsPerUserPerDay = baseCoins + bonusCoins;
  const milestoneCoinsPerUserPerDay =
    ESTIMATED_DAILY_MILESTONE_COINS_PER_USER * milestoneMultiplier;
  const dailyMintPerUser = conversionCoinsPerUserPerDay + milestoneCoinsPerUserPerDay;
  const dailyBurnPerUser = dailyMintPerUser * ESTIMATED_BURN_RATIO * cosmeticMultiplier * 0.5 + dailyMintPerUser * ESTIMATED_BURN_RATIO * 0.5;

  let supply = 0;
  let totalMint = 0;
  let totalBurn = 0;

  for (let d = 0; d < days; d++) {
    const dayMint = userCount * dailyMintPerUser;
    const dayBurn = userCount * dailyBurnPerUser;
    supply += dayMint - dayBurn;
    totalMint += dayMint;
    totalBurn += dayBurn;
  }

  const projectedMintRate = days > 0 ? totalMint / days : 0;
  const projectedBurnRate = days > 0 ? totalBurn / days : 0;
  const avgCoinPerUser = userCount > 0 ? supply / userCount : 0;
  const burnForRatio = projectedBurnRate > 0 ? projectedBurnRate : 1;
  const mintBurnRatio = projectedMintRate / burnForRatio;
  const inflationRiskScore =
    mintBurnRatio * (avgCoinPerUser / BASELINE_COIN_TARGET);

  return {
    projected_coin_supply: Math.round(supply),
    projected_mint_rate: Math.round(projectedMintRate * 100) / 100,
    projected_burn_rate: Math.round(projectedBurnRate * 100) / 100,
    inflation_risk_score: Math.round(inflationRiskScore * 100) / 100,
  };
}
