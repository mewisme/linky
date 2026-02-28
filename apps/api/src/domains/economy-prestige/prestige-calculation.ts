import type { PrestigeRank, PrestigeRankAndTier } from "./types/prestige.types.js";

const RANKS: PrestigeRank[] = [
  "plastic",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "immortal",
  "ascendant",
  "eternal",
  "mythic",
  "celestial",
  "transcendent",
];

const POINTS_PER_RANK = 300;
const MAX_TIERED_POINTS = 3600;

export function getPrestigeRankAndTier(prestigePoints: number): PrestigeRankAndTier {
  const points = Math.max(0, Math.floor(prestigePoints));

  if (points >= MAX_TIERED_POINTS) {
    return { rank: "transcendent", tier: null };
  }

  const rankIdx = Math.min(11, Math.floor(points / POINTS_PER_RANK));
  const tier = Math.floor((points % POINTS_PER_RANK) / 100) + 1;
  const clampedTier = Math.min(3, Math.max(1, tier));

  return {
    rank: RANKS[rankIdx] ?? "plastic",
    tier: clampedTier,
  };
}
