import type { ActiveBoost, ActiveBoostRecord } from "@/domains/economy-boost/types/boost.types.js";

import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-boost:repository:boost");

function toActiveBoost(r: ActiveBoostRecord): ActiveBoost {
  return {
    id: r.id,
    boostType: r.boost_type as ActiveBoost["boostType"],
    multiplier: r.multiplier,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

export async function getActiveBoosts(userId: string): Promise<ActiveBoost[]> {
  const { data, error } = await supabase
    .from("user_active_boosts")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });

  if (error) {
    logger.error(error as Error, "Error fetching active boosts");
    throw error;
  }
  return ((data ?? []) as ActiveBoostRecord[]).map(toActiveBoost);
}
