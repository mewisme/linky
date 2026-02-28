import type { ExpTransactionRecord } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:repository:exp-ledger");

export async function getRecentExpTransactions(
  userId: string,
  limit: number
): Promise<ExpTransactionRecord[]> {
  const { data, error } = await supabase
    .from("user_exp_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error fetching exp transactions: %o", error as Error);
    throw error;
  }

  return (data ?? []) as ExpTransactionRecord[];
}
