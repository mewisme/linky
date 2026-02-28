import type { CreateSeasonBody, Season, UpdateSeasonBody } from "@/domains/economy-season/types/season.types.js";
import {
  createSeason,
  getSeason,
  listSeasons,
  runDecayForSeason,
  updateSeason,
} from "@/domains/economy-season/index.js";

export async function listAdminSeasons(): Promise<Season[]> {
  return listSeasons();
}

export async function getAdminSeason(id: string): Promise<Season | null> {
  return getSeason(id);
}

export async function createAdminSeason(body: CreateSeasonBody): Promise<Season> {
  return createSeason(body);
}

export async function updateAdminSeason(id: string, body: UpdateSeasonBody): Promise<Season> {
  return updateSeason(id, body);
}

export async function forceDecaySeason(id: string): Promise<{ processed: number; failed: number }> {
  const season = await getSeason(id);
  if (!season) {
    const err = new Error("Season not found");
    (err as Error & { code: string }).code = "NOT_FOUND";
    throw err;
  }
  if (new Date(season.endAt) > new Date()) {
    const err = new Error("Season has not ended");
    (err as Error & { code: string }).code = "SEASON_NOT_EXPIRED";
    throw err;
  }
  return runDecayForSeason(id);
}
