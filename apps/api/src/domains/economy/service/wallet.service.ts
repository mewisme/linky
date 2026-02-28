import type { Wallet } from "@/domains/economy/types/economy.types.js";
import { getWallet as getWalletRecord } from "@/domains/economy/repository/wallet.repository.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:service:wallet");

function toWallet(
  r: {
    user_id: string;
    coin_balance: number;
    vault_coin_balance: number;
    total_earned: number;
    total_spent: number;
    created_at: string;
    updated_at: string;
  }
): Wallet {
  return {
    userId: r.user_id,
    coinBalance: r.coin_balance,
    vaultCoinBalance: r.vault_coin_balance,
    totalEarned: r.total_earned,
    totalSpent: r.total_spent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getWallet(userId: string): Promise<Wallet> {
  const record = await getWalletRecord(userId);
  if (!record) {
    return {
      userId,
      coinBalance: 0,
      vaultCoinBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return toWallet(record);
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const { error } = await supabase.from("user_wallets").upsert(
    { user_id: userId, coin_balance: 0, total_earned: 0, total_spent: 0 },
    { onConflict: "user_id" }
  );

  if (error) {
    logger.error("Error ensuring wallet exists: %o", error as Error);
    throw error;
  }

  const record = await getWalletRecord(userId);
  if (!record) {
    return {
      userId,
      coinBalance: 0,
      vaultCoinBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return toWallet(record);
}
