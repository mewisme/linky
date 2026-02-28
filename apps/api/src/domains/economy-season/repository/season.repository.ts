import type { SeasonRecord } from "@/domains/economy-season/types/season.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-season:repository:season");

export async function listSeasons(): Promise<SeasonRecord[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_at", { ascending: false });

  if (error) {
    logger.error("Error listing seasons: %o", error as Error);
    throw error;
  }

  return (data ?? []) as SeasonRecord[];
}

export async function getSeasonById(id: string): Promise<SeasonRecord | null> {
  const { data, error } = await supabase.from("seasons").select("*").eq("id", id).maybeSingle();

  if (error) {
    logger.error("Error fetching season %s: %o", id, error as Error);
    throw error;
  }

  return data as SeasonRecord | null;
}

export async function getActiveSeason(): Promise<SeasonRecord | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching active season: %o", error as Error);
    throw error;
  }

  return data as SeasonRecord | null;
}

export async function getExpiredActiveSeason(): Promise<SeasonRecord | null> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .lte("end_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    logger.error("Error fetching expired active season: %o", error as Error);
    throw error;
  }

  return data as SeasonRecord | null;
}

export async function createSeason(row: {
  name: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  decay_threshold: number;
  decay_rate: number;
}): Promise<SeasonRecord> {
  const { data, error } = await supabase.from("seasons").insert(row).select().single();

  if (error) {
    logger.error("Error creating season: %o", error as Error);
    throw error;
  }

  return data as SeasonRecord;
}

export async function updateSeason(
  id: string,
  updates: Partial<{
    name: string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    decay_threshold: number;
    decay_rate: number;
  }>
): Promise<SeasonRecord> {
  const { data, error } = await supabase.from("seasons").update(updates).eq("id", id).select().single();

  if (error) {
    logger.error("Error updating season %s: %o", id, error as Error);
    throw error;
  }

  return data as SeasonRecord;
}

export async function getPendingUserIdsForSeason(seasonId: string): Promise<string[]> {
  const { data: walletUserIds, error: walletError } = await supabase
    .from("user_wallets")
    .select("user_id");

  if (walletError) {
    logger.error("Error fetching wallet user ids: %o", walletError as Error);
    throw walletError;
  }

  const { data: processedRows, error: processedError } = await supabase
    .from("user_season_records")
    .select("user_id")
    .eq("season_id", seasonId)
    .eq("decay_processed", true);

  if (processedError) {
    logger.error("Error fetching processed user ids: %o", processedError as Error);
    throw processedError;
  }

  const processedSet = new Set((processedRows ?? []).map((r: { user_id: string }) => r.user_id));
  return (walletUserIds ?? []).map((r: { user_id: string }) => r.user_id).filter((id) => !processedSet.has(id));
}
