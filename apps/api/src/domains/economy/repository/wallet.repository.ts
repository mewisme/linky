import type { WalletRecord } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:repository:wallet");

export async function getWallet(userId: string): Promise<WalletRecord | null> {
  const { data, error } = await supabase
    .from("user_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error(error as Error, "Error fetching wallet");
    throw error;
  }

  return data as WalletRecord | null;
}
