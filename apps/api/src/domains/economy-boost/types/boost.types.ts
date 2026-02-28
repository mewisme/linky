export type BoostType = "exp_boost_30m" | "daily_reward_multiplier";

export interface BoostConfig {
  cost: number;
  durationSeconds: number;
  multiplier: number;
}

export const BOOST_CONFIGS: Record<BoostType, BoostConfig> = {
  exp_boost_30m: {
    cost: 120,
    durationSeconds: 30 * 60,
    multiplier: 1.2,
  },
  daily_reward_multiplier: {
    cost: 80,
    durationSeconds: 24 * 60 * 60,
    multiplier: 2.0,
  },
};

export interface ActiveBoostRecord {
  id: string;
  user_id: string;
  boost_type: BoostType;
  multiplier: number;
  expires_at: string;
  created_at: string;
}

export interface ActiveBoost {
  id: string;
  boostType: BoostType;
  multiplier: number;
  expiresAt: string;
  createdAt: string;
}

export interface PurchaseBoostBody {
  boostType: BoostType;
}

export interface PurchaseBoostResult {
  expiresAt: string;
  newCoinBalance: number;
}

export interface PurchaseBoostRpcRow {
  expires_at: string;
  new_coin_balance: number;
}
