export type CoinTransactionType =
  | "exp_conversion"
  | "level_reward"
  | "admin_adjustment"
  | "shop_purchase"
  | "boost_purchase"
  | "seasonal_decay"
  | "vault_deposit";

export type ExpTransactionType = "call_duration" | "exp_conversion" | "admin_adjustment";

export interface WalletRecord {
  id: string;
  user_id: string;
  coin_balance: number;
  vault_coin_balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CoinTransactionRecord {
  id: string;
  user_id: string;
  type: CoinTransactionType;
  amount: number;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ExpTransactionRecord {
  id: string;
  user_id: string;
  type: ExpTransactionType;
  amount: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Wallet {
  userId: string;
  coinBalance: number;
  vaultCoinBalance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionResult {
  expSpent: number;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  newCoinBalance: number;
}

export interface ConvertExpBody {
  expAmount: number;
}

export interface ConvertExpResponse {
  expSpent: number;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  newCoinBalance: number;
}

export interface ConvertExpToCoinRpcRow {
  exp_spent: number;
  base_coins: number;
  bonus_coins: number;
  total_coins: number;
  new_coin_balance: number;
}
