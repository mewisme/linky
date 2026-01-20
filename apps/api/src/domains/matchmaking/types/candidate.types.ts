import type { FavoriteType } from "./scoring.types.js";

export interface QueueUser {
  userId: string;
  interestTags: string[];
  joinedAt: number;
}

export interface MatchResult {
  userA: QueueUser;
  userB: QueueUser;
  score: number;
  commonInterests: number;
}

export interface MatchOptions {
  skipSets: Map<string, Set<string>>;
  now: number;
}

export interface ScoredCandidatePair {
  userA: QueueUser;
  userB: QueueUser;
  score: number;
  commonInterests: number;
  favoriteType: FavoriteType;
}

