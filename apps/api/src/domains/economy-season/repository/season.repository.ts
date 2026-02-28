import type { SeasonRecord } from "@/domains/economy-season/types/season.types.js";
import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-season:repository:season");

export async function listSeasons(): Promise<SeasonRecord[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_at", { ascending: false });

  if (error) {
    logger.error(error as Error, "Error listing seasons");
    throw error;
  }

  return (data ?? []) as SeasonRecord[];
}

export async function getSeasonById(id: string): Promise<SeasonRecord | null> {
  const { data, error } = await supabase.from("seasons").select("*").eq("id", id).maybeSingle();

  if (error) {
    logger.error(error as Error, "Error fetching season %s", id);
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
    logger.error(error as Error, "Error fetching active season");
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
    logger.error(error as Error, "Error fetching expired active season");
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
    logger.error(error as Error, "Error creating season");
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
    logger.error(error as Error, "Error updating season %s", id);
    throw error;
  }

  return data as SeasonRecord;
}

export async function getPendingUserIdsForSeason(seasonId: string): Promise<string[]> {
  const { data: walletUserIds, error: walletError } = await supabase
    .from("user_wallets")
    .select("user_id");

  if (walletError) {
    logger.error(walletError as Error, "Error fetching wallet user ids");
    throw walletError;
  }

  const { data: processedRows, error: processedError } = await supabase
    .from("user_season_records")
    .select("user_id")
    .eq("season_id", seasonId)
    .eq("decay_processed", true);

  if (processedError) {
    logger.error(processedError as Error, "Error fetching processed user ids");
    throw processedError;
  }

  const processedSet = new Set((processedRows ?? []).map((r: { user_id: string }) => r.user_id));
  return (walletUserIds ?? []).map((r: { user_id: string }) => r.user_id).filter((id) => !processedSet.has(id));
}
