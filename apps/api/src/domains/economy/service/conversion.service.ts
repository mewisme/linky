import type { ConversionResult, ConvertExpToCoinRpcRow } from "@/domains/economy/types/economy.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy:service:conversion");

export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_AMOUNT" | "INSUFFICIENT_EXP"
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

function mapRpcRow(row: ConvertExpToCoinRpcRow): ConversionResult {
  return {
    expSpent: Number(row.exp_spent),
    baseCoins: row.base_coins,
    bonusCoins: row.bonus_coins,
    totalCoins: row.total_coins,
    newCoinBalance: row.new_coin_balance,
  };
}

export async function convertExpToCoin(userId: string, expAmount: number): Promise<ConversionResult> {
  if (expAmount < 100 || expAmount % 100 !== 0 || !Number.isInteger(expAmount) || expAmount <= 0) {
    throw new ConversionError("expAmount must be a positive integer multiple of 100, at least 100", "INVALID_AMOUNT");
  }

  const { data, error } = await supabase.rpc("convert_exp_to_coin", {
    p_user_id: userId,
    p_exp_amount: expAmount,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("INSUFFICIENT_EXP")) {
      throw new ConversionError("Insufficient EXP balance", "INSUFFICIENT_EXP");
    }
    if (msg.includes("INVALID_AMOUNT")) {
      throw new ConversionError("Invalid exp amount", "INVALID_AMOUNT");
    }
    logger.error("Error converting EXP to coin: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as ConvertExpToCoinRpcRow) : (data as ConvertExpToCoinRpcRow);
  if (!row) {
    logger.error("convert_exp_to_coin RPC returned no row");
    throw new Error("Conversion failed");
  }

  return mapRpcRow(row);
}
