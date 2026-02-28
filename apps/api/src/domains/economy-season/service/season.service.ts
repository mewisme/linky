import type {
  CreateSeasonBody,
  Season,
  SeasonRecord,
  UpdateSeasonBody,
} from "@/domains/economy-season/types/season.types.js";
import {
  createSeason as createSeasonRow,
  getActiveSeason,
  getExpiredActiveSeason,
  getSeasonById,
  listSeasons as listSeasonsFromDb,
  updateSeason as updateSeasonRow,
} from "@/domains/economy-season/repository/season.repository.js";

function toSeason(r: SeasonRecord): Season {
  return {
    id: r.id,
    name: r.name,
    startAt: r.start_at,
    endAt: r.end_at,
    isActive: r.is_active,
    decayThreshold: r.decay_threshold,
    decayRate: r.decay_rate,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSeasons(): Promise<Season[]> {
  const rows = await listSeasonsFromDb();
  return rows.map(toSeason);
}

export async function getSeason(id: string): Promise<Season | null> {
  const row = await getSeasonById(id);
  return row ? toSeason(row) : null;
}

export async function getExpiredUnprocessedSeason(): Promise<Season | null> {
  const row = await getExpiredActiveSeason();
  return row ? toSeason(row) : null;
}

export async function createSeason(body: CreateSeasonBody): Promise<Season> {
  if (body.isActive !== false) {
    const active = await getActiveSeason();
    if (active) {
      const err = new Error("Another season is already active");
      (err as Error & { code: string }).code = "ACTIVE_SEASON_EXISTS";
      throw err;
    }
  }

  const row = await createSeasonRow({
    name: body.name,
    start_at: body.startAt,
    end_at: body.endAt,
    is_active: body.isActive ?? false,
    decay_threshold: body.decayThreshold ?? 500,
    decay_rate: body.decayRate ?? 0.3,
  });
  return toSeason(row);
}

export async function updateSeason(id: string, body: UpdateSeasonBody): Promise<Season> {
  if (body.isActive === true) {
    const active = await getActiveSeason();
    if (active && active.id !== id) {
      const err = new Error("Another season is already active");
      (err as Error & { code: string }).code = "ACTIVE_SEASON_EXISTS";
      throw err;
    }
  }

  const updates: Parameters<typeof updateSeasonRow>[1] = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.startAt !== undefined) updates.start_at = body.startAt;
  if (body.endAt !== undefined) updates.end_at = body.endAt;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.decayThreshold !== undefined) updates.decay_threshold = body.decayThreshold;
  if (body.decayRate !== undefined) updates.decay_rate = body.decayRate;

  const row = await updateSeasonRow(id, updates);
  return toSeason(row);
}

export async function deactivateSeason(id: string): Promise<void> {
  await updateSeasonRow(id, { is_active: false });
}
