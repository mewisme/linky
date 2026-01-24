import { describe, it, expect } from "vitest";
import {
  calculateCommonInterestsFromTags,
  calculateCommonInterests,
  calculateFairnessBonus,
  calculateInterestScore,
  calculateRedisCandidateScore,
  calculateFavoriteType,
} from "../../../domains/matchmaking/service/scoring.service.js";

function makeUser(override: Partial<{ userId: string; interestTags: string[]; joinedAt: number }> = {}) {
  return {
    userId: "u",
    interestTags: [],
    joinedAt: 0,
    ...override,
  };
}

describe("calculateCommonInterestsFromTags", () => {
  it("returns 0 when both empty", () => {
    expect(calculateCommonInterestsFromTags([], [])).toBe(0);
  });

  it("returns 1 when one common tag", () => {
    expect(calculateCommonInterestsFromTags(["a", "b"], ["b", "c"])).toBe(1);
  });

  it("returns 0 when disjoint", () => {
    expect(calculateCommonInterestsFromTags(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("counts duplicates in one list only once", () => {
    expect(calculateCommonInterestsFromTags(["a", "a", "b"], ["a", "c"])).toBe(1);
  });
});

describe("calculateCommonInterests", () => {
  it("delegates to calculateCommonInterestsFromTags via interestTags", () => {
    const a = makeUser({ interestTags: ["x", "y"] });
    const b = makeUser({ interestTags: ["y", "z"] });
    expect(calculateCommonInterests(a, b)).toBe(1);
  });
});

describe("calculateFairnessBonus", () => {
  it("returns 0 when both wait 0", () => {
    expect(calculateFairnessBonus({ now: 1000, joinedAtA: 1000, joinedAtB: 1000 })).toBe(0);
  });

  it("returns min of (avgWait/1000)*0.1 and MAX_FAIRNESS_BONUS", () => {
    const now = 10000;
    const joinedAtA = 0;
    const joinedAtB = 0;
    const avgWaitTime = (10000 + 10000) / 2;
    expect(calculateFairnessBonus({ now, joinedAtA, joinedAtB })).toBe((avgWaitTime / 1000) * 0.1);
  });

  it("caps at MAX_FAIRNESS_BONUS (20)", () => {
    const now = 500000;
    const joinedAtA = 0;
    const joinedAtB = 0;
    expect(calculateFairnessBonus({ now, joinedAtA, joinedAtB })).toBe(20);
  });
});

describe("calculateInterestScore", () => {
  it("commonInterests * 100 + fairnessBonus when no both-have-tags bonus", () => {
    expect(calculateInterestScore({ commonInterests: 2, tagsCountA: 0, tagsCountB: 1, fairnessBonus: 5 })).toBe(
      2 * 100 + 5,
    );
  });

  it("adds BONUS_BOTH_HAVE_TAGS when commonInterests>0 and both have tags", () => {
    expect(calculateInterestScore({ commonInterests: 1, tagsCountA: 1, tagsCountB: 1, fairnessBonus: 0 })).toBe(
      100 + 50,
    );
  });

  it("adds fairnessBonus", () => {
    expect(calculateInterestScore({ commonInterests: 1, tagsCountA: 1, tagsCountB: 1, fairnessBonus: 10 })).toBe(
      100 + 50 + 10,
    );
  });
});

describe("calculateRedisCandidateScore", () => {
  it("returns { score, commonInterests } combining the above", () => {
    const a = makeUser({ userId: "a", interestTags: ["x"], joinedAt: 0 });
    const b = makeUser({ userId: "b", interestTags: ["x"], joinedAt: 0 });
    const r = calculateRedisCandidateScore(a, b, 10000);
    expect(r.commonInterests).toBe(1);
    expect(r.score).toBeGreaterThan(0);
  });
});

describe("calculateFavoriteType", () => {
  it("returns mutual when both favorite each other", () => {
    expect(calculateFavoriteType(new Set(["b"]), new Set(["a"]), "a", "b")).toBe("mutual");
  });

  it("returns one-way when only A favorites B", () => {
    expect(calculateFavoriteType(new Set(["b"]), new Set(), "a", "b")).toBe("one-way");
  });

  it("returns one-way when only B favorites A", () => {
    expect(calculateFavoriteType(new Set(), new Set(["a"]), "a", "b")).toBe("one-way");
  });

  it("returns none when neither", () => {
    expect(calculateFavoriteType(new Set(), new Set(), "a", "b")).toBe("none");
  });

  it("handles undefined sets", () => {
    expect(calculateFavoriteType(undefined, undefined, "a", "b")).toBe("none");
  });
});
