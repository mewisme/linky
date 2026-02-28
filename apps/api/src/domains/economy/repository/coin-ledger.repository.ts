import type { CoinTransactionRecord } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:repository:coin-ledger");

export async function getRecentCoinTransactions(
  userId: string,
  limit: number
): Promise<CoinTransactionRecord[]> {
  const { data, error } = await supabase
    .from("user_coin_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error fetching coin transactions: %o", error as Error);
    throw error;
  }

  return (data ?? []) as CoinTransactionRecord[];
}
