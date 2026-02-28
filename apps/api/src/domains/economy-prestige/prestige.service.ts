import type { PrestigeResult, PrestigeUserRpcRow } from "./types/prestige.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-prestige:service");

function mapRpcRow(row: PrestigeUserRpcRow): PrestigeResult {
  return {
    vaultBonus: row.vault_bonus,
    totalPrestiges: row.new_total_prestiges,
    prestigeRank: row.prestige_rank,
    prestigeTier: row.prestige_tier,
  };
}

export async function prestigeUser(userId: string): Promise<PrestigeResult> {
  const { data, error } = await supabase.rpc("prestige_user", {
    p_user_id: userId,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("PRESTIGE_THRESHOLD_NOT_MET")) {
      const e = new Error("Prestige threshold not met");
      (e as Error & { code: string }).code = "PRESTIGE_THRESHOLD_NOT_MET";
      throw e;
    }
    if (msg.includes("USER_NOT_FOUND")) {
      const e = new Error("User not found");
      (e as Error & { code: string }).code = "USER_NOT_FOUND";
      throw e;
    }
    logger.error("Error calling prestige_user: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as PrestigeUserRpcRow) : (data as PrestigeUserRpcRow);
  if (!row) {
    logger.error("prestige_user RPC returned no row");
    throw new Error("Prestige failed");
  }

  return mapRpcRow(row);
}
