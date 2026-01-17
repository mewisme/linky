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

const SCORE_PER_COMMON_INTEREST = 100;
const BONUS_BOTH_HAVE_TAGS = 50;
const PENALTY_SKIP_COOLDOWN = -10000;
const FAIRNESS_BONUS_PER_SECOND = 0.1;
const MAX_FAIRNESS_BONUS = 20;

function calculateMatchScore(
  userA: QueueUser,
  userB: QueueUser,
  options: MatchOptions
): { score: number; commonInterests: number } {
  const skipSetA = options.skipSets.get(userA.userId);
  const skipSetB = options.skipSets.get(userB.userId);

  if (skipSetA?.has(userB.userId) || skipSetB?.has(userA.userId)) {
    return { score: PENALTY_SKIP_COOLDOWN, commonInterests: 0 };
  }

  let score = 0;
  let commonInterests = 0;

  const tagsA = new Set(userA.interestTags);
  const tagsB = new Set(userB.interestTags);
  const hasTagsA = tagsA.size > 0;
  const hasTagsB = tagsB.size > 0;

  for (const tag of tagsA) {
    if (tagsB.has(tag)) {
      commonInterests++;
      score += SCORE_PER_COMMON_INTEREST;
    }
  }

  if (commonInterests > 0 && hasTagsA && hasTagsB) {
    score += BONUS_BOTH_HAVE_TAGS;
  }

  const waitTimeA = options.now - userA.joinedAt;
  const waitTimeB = options.now - userB.joinedAt;
  const avgWaitTime = (waitTimeA + waitTimeB) / 2;
  const fairnessBonus = Math.min(
    (avgWaitTime / 1000) * FAIRNESS_BONUS_PER_SECOND,
    MAX_FAIRNESS_BONUS
  );
  score += fairnessBonus;

  return { score, commonInterests };
}

export function findBestMatch(
  users: QueueUser[],
  options: MatchOptions
): MatchResult | null {
  if (users.length < 2) {
    return null;
  }

  const matchesWithCommonInterests: MatchResult[] = [];
  const matchesWithoutCommonInterests: MatchResult[] = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];

      if (!userA || !userB) {
        continue;
      }

      const { score, commonInterests } = calculateMatchScore(userA, userB, options);

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

  const candidates = matchesWithCommonInterests.length > 0
    ? matchesWithCommonInterests
    : matchesWithoutCommonInterests;

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
