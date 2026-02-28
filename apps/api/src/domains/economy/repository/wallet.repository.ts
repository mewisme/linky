import type { WalletRecord } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:repository:wallet");

export async function getWallet(userId: string): Promise<WalletRecord | null> {
  const { data, error } = await supabase
    .from("user_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching wallet: %o", error as Error);
    throw error;
  }

  return data as WalletRecord | null;
}
