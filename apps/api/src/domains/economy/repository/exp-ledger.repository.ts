import type { ExpTransactionRecord } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@/utils/logger.js";
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
    logger.error(error as Error, "Error fetching exp transactions");
    throw error;
  }

  return (data ?? []) as ExpTransactionRecord[];
}
