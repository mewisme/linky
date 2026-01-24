import { describe, it, expect } from "vitest";
import { findBestMatch } from "../../../domains/matchmaking/service/matcher.service.js";

function makeUser(override: Partial<{ userId: string; interestTags: string[]; joinedAt: number }> = {}) {
  return {
    userId: "u",
    interestTags: [],
    joinedAt: 0,
    ...override,
  };
}

describe("findBestMatch", () => {
  it("returns null when users.length < 2", () => {
    expect(findBestMatch([], { skipSets: new Map(), now: 0 })).toBeNull();
    expect(findBestMatch([makeUser({ userId: "a" })], { skipSets: new Map(), now: 0 })).toBeNull();
  });

  it("when skipSets has A-B and enforceCooldown: pair excluded from normal flow; deadlock fallback returns match", () => {
    const a = makeUser({ userId: "a", interestTags: ["x"] });
    const b = makeUser({ userId: "b", interestTags: ["x"] });
    const skipSets = new Map<string, Set<string>>();
    skipSets.set("a", new Set(["b"]));
    const r = findBestMatch([a, b], { skipSets, now: 1000 });
    expect(r).not.toBeNull();
    expect(r!.userA.userId).toBe("a");
    expect(r!.userB.userId).toBe("b");
  });

  it("prefers matches with common interests over those without", () => {
    const a = makeUser({ userId: "a", interestTags: ["x"] });
    const b = makeUser({ userId: "b", interestTags: ["x"] });
    const c = makeUser({ userId: "c", interestTags: [] });
    const r = findBestMatch([a, b, c], { skipSets: new Map(), now: 1000 });
    expect(r).not.toBeNull();
    expect(r!.commonInterests).toBe(1);
    expect([r!.userA.userId, r!.userB.userId].sort()).toEqual(["a", "b"]);
  });

  it("sorts by commonInterests desc then score desc", () => {
    const a = makeUser({ userId: "a", interestTags: ["x", "y"] });
    const b = makeUser({ userId: "b", interestTags: ["x", "y"] });
    const c = makeUser({ userId: "c", interestTags: ["x"] });
    const r = findBestMatch([a, b, c], { skipSets: new Map(), now: 1000 });
    expect(r!.commonInterests).toBe(2);
    expect([r!.userA.userId, r!.userB.userId].sort()).toEqual(["a", "b"]);
  });

  it("deadlock: 2 users, no matches with/without common interests (e.g. both skipped) -> fallback with enforceCooldown false", () => {
    const a = makeUser({ userId: "a", interestTags: [] });
    const b = makeUser({ userId: "b", interestTags: [] });
    const skipSets = new Map<string, Set<string>>();
    skipSets.set("a", new Set(["b"]));
    const r = findBestMatch([a, b], { skipSets, now: 1000 });
    expect(r).not.toBeNull();
    expect(r!.userA.userId).toBe("a");
    expect(r!.userB.userId).toBe("b");
  });

  it("returns best match when multiple pairs", () => {
    const a = makeUser({ userId: "a", interestTags: ["x"] });
    const b = makeUser({ userId: "b", interestTags: ["x"] });
    const c = makeUser({ userId: "c", interestTags: ["y"] });
    const d = makeUser({ userId: "d", interestTags: ["y"] });
    const r = findBestMatch([a, b, c, d], { skipSets: new Map(), now: 1000 });
    expect(r).not.toBeNull();
    expect(r!.commonInterests).toBe(1);
  });
});
