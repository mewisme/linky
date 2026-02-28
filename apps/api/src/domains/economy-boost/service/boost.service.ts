import type { BoostType, PurchaseBoostRpcRow } from "@/domains/economy-boost/types/boost.types.js";
import { BOOST_CONFIGS } from "@/domains/economy-boost/types/boost.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-boost:service:boost");

export class BoostError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_BOOST_TYPE" | "INSUFFICIENT_COINS"
  ) {
    super(message);
    this.name = "BoostError";
  }
}

export async function purchaseBoost(
  userId: string,
  boostType: string
): Promise<{ expiresAt: string; newCoinBalance: number }> {
  const config = BOOST_CONFIGS[boostType as BoostType];
  if (!config) {
    throw new BoostError("Invalid boost type", "INVALID_BOOST_TYPE");
  }

  const { data, error } = await supabase.rpc("purchase_boost", {
    p_user_id: userId,
    p_boost_type: boostType,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("INVALID_BOOST_TYPE")) {
      throw new BoostError("Invalid boost type", "INVALID_BOOST_TYPE");
    }
    if (msg.includes("INSUFFICIENT_COINS")) {
      throw new BoostError("Insufficient coins", "INSUFFICIENT_COINS");
    }
    logger.error("Error purchasing boost: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as PurchaseBoostRpcRow) : (data as PurchaseBoostRpcRow);
  if (!row) {
    logger.error("purchase_boost RPC returned no row");
    throw new Error("Purchase failed");
  }
  return {
    expiresAt: row.expires_at,
    newCoinBalance: row.new_coin_balance,
  };
}
