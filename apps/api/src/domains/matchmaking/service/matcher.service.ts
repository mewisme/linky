import type { MatchOptions, MatchResult, QueueUser } from "@/domains/matchmaking/types/candidate.types.js";
import { calculateCommonInterestsFromTags, calculateFairnessBonus } from "./scoring.service.js";

const SCORE_PER_COMMON_INTEREST = 100;
const BONUS_BOTH_HAVE_TAGS = 50;
const PENALTY_SKIP_COOLDOWN = -10000;

function calculateMatchScore(
  userA: QueueUser,
  userB: QueueUser,
  options: MatchOptions,
  enforceSkipCooldown: boolean = true,
): { score: number; commonInterests: number } {
  const skipSetA = options.skipSets.get(userA.userId);
  const skipSetB = options.skipSets.get(userB.userId);

  if (enforceSkipCooldown && (skipSetA?.has(userB.userId) || skipSetB?.has(userA.userId))) {
    return { score: PENALTY_SKIP_COOLDOWN, commonInterests: 0 };
  }

  const commonInterests = calculateCommonInterestsFromTags(userA.interestTags, userB.interestTags);

  let score = commonInterests * SCORE_PER_COMMON_INTEREST;

  const hasTagsA = userA.interestTags.length > 0;
  const hasTagsB = userB.interestTags.length > 0;
  if (commonInterests > 0 && hasTagsA && hasTagsB) {
    score += BONUS_BOTH_HAVE_TAGS;
  }

  const fairnessBonus = calculateFairnessBonus({
    now: options.now,
    joinedAtA: userA.joinedAt,
    joinedAtB: userB.joinedAt,
  });
  score += fairnessBonus;

  return { score, commonInterests };
}

export function findBestMatch(users: QueueUser[], options: MatchOptions): MatchResult | null {
  if (users.length < 2) {
    return null;
  }

  const matchesWithCommonInterests: MatchResult[] = [];
  const matchesWithoutCommonInterests: MatchResult[] = [];

  const isDeadlockScenario = users.length === 2;

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];

      if (!userA || !userB) {
        continue;
      }

      const commonInterests = calculateCommonInterestsFromTags(userA.interestTags, userB.interestTags);
      const isPhase1 = commonInterests > 0;
      const shouldEnforceCooldown = isPhase1 || !isDeadlockScenario;

      const { score } = calculateMatchScore(userA, userB, options, shouldEnforceCooldown);

      if (score < PENALTY_SKIP_COOLDOWN / 2) {
        continue;
      }

      const match: MatchResult = {
        userA,
        userB,
        score,
        commonInterests,
      };

      if (commonInterests > 0) {
        matchesWithCommonInterests.push(match);
      } else {
        matchesWithoutCommonInterests.push(match);
      }
    }
  }

  if (isDeadlockScenario && matchesWithCommonInterests.length === 0 && matchesWithoutCommonInterests.length === 0) {
    const userA = users[0];
    const userB = users[1];
    if (userA && userB) {
      const { score, commonInterests } = calculateMatchScore(userA, userB, options, false);
      return {
        userA,
        userB,
        score,
        commonInterests,
      };
    }
  }

  const candidates = matchesWithCommonInterests.length > 0 ? matchesWithCommonInterests : matchesWithoutCommonInterests;

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.commonInterests !== b.commonInterests) {
      return b.commonInterests - a.commonInterests;
    }
    return b.score - a.score;
  });

  return candidates[0] || null;
}

