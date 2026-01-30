import { DEFAULT_EMBEDDING_CONFIG, calculateEmbeddingScore } from "./embedding-score.service.js";

import type { EmbeddingScoreConfig } from "../types/embedding.types.js";
import type { FavoriteType } from "../types/scoring.types.js";
import type { QueueUser } from "../types/candidate.types.js";

const SCORE_PER_COMMON_INTEREST = 100;
const BONUS_BOTH_HAVE_TAGS = 50;
const FAIRNESS_BONUS_PER_SECOND = 0.1;
const MAX_FAIRNESS_BONUS = 20;

export function calculateCommonInterestsFromTags(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let commonInterests = 0;

  for (const tag of setA) {
    if (setB.has(tag)) {
      commonInterests++;
    }
  }

  return commonInterests;
}

export function calculateCommonInterests(userA: QueueUser, userB: QueueUser): number {
  return calculateCommonInterestsFromTags(userA.interestTags, userB.interestTags);
}

export function calculateFairnessBonus(params: { now: number; joinedAtA: number; joinedAtB: number }): number {
  const { now, joinedAtA, joinedAtB } = params;

  const waitTimeA = now - joinedAtA;
  const waitTimeB = now - joinedAtB;
  const avgWaitTime = (waitTimeA + waitTimeB) / 2;

  return Math.min((avgWaitTime / 1000) * FAIRNESS_BONUS_PER_SECOND, MAX_FAIRNESS_BONUS);
}

export function calculateInterestScore(params: {
  commonInterests: number;
  tagsCountA: number;
  tagsCountB: number;
  fairnessBonus: number;
}): number {
  const { commonInterests, tagsCountA, tagsCountB, fairnessBonus } = params;

  let score = commonInterests * SCORE_PER_COMMON_INTEREST;

  if (commonInterests > 0 && tagsCountA > 0 && tagsCountB > 0) {
    score += BONUS_BOTH_HAVE_TAGS;
  }

  score += fairnessBonus;

  return score;
}

export function calculateRedisCandidateScore(userA: QueueUser, userB: QueueUser, now: number): {
  score: number;
  commonInterests: number;
} {
  const commonInterests = calculateCommonInterests(userA, userB);

  const fairnessBonus = calculateFairnessBonus({
    now,
    joinedAtA: userA.joinedAt,
    joinedAtB: userB.joinedAt,
  });

  const score = calculateInterestScore({
    commonInterests,
    tagsCountA: userA.interestTags.length,
    tagsCountB: userB.interestTags.length,
    fairnessBonus,
  });

  return { score, commonInterests };
}

export function calculateRedisCandidateScoreWithEmbedding(
  userA: QueueUser,
  userB: QueueUser,
  now: number,
  embeddingSimilarity: number | null,
  embeddingConfig: EmbeddingScoreConfig = DEFAULT_EMBEDDING_CONFIG
): {
  score: number;
  commonInterests: number;
  embeddingScore: number;
} {
  const { score: baseScore, commonInterests } = calculateRedisCandidateScore(userA, userB, now);

  const embeddingScore = calculateEmbeddingScore(embeddingSimilarity, embeddingConfig);

  return {
    score: baseScore + embeddingScore,
    commonInterests,
    embeddingScore,
  };
}

export function calculateFavoriteType(
  favoritesA: Set<string> | undefined,
  favoritesB: Set<string> | undefined,
  userAId: string,
  userBId: string,
): FavoriteType {
  const aFavoritesB = favoritesA?.has(userBId) || false;
  const bFavoritesA = favoritesB?.has(userAId) || false;

  if (aFavoritesB && bFavoritesA) {
    return "mutual";
  }
  if (aFavoritesB || bFavoritesA) {
    return "one-way";
  }
  return "none";
}

