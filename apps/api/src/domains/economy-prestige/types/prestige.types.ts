export type PrestigeRank =
  | "plastic"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "immortal"
  | "ascendant"
  | "eternal"
  | "mythic"
  | "celestial"
  | "transcendent";

export interface PrestigeRankAndTier {
  rank: PrestigeRank;
  tier: number | null;
}

export interface PrestigeResult {
  vaultBonus: number;
  totalPrestiges: number;
  prestigeRank: PrestigeRank;
  prestigeTier: number | null;
}

export interface PrestigeUserRpcRow {
  vault_bonus: number;
  new_total_prestiges: number;
  prestige_rank: PrestigeRank;
  prestige_tier: number | null;
}
