import {
  addCallExp,
  computeExpSecondsForCallDuration,
  getUserLevelData,
} from "../../../domains/user/service/user-level.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserLevel = vi.fn();
const mockIncrementUserExp = vi.fn();
const mockGetUserStreak = vi.fn();
const mockGetStreakExpBonusForStreak = vi.fn();
const mockGrantRewardsForLevel = vi.fn();
const mockGrantFreezesForLevel = vi.fn();
const mockIncrementDailyExpWithMilestones = vi.fn();

vi.mock("../../../infra/supabase/repositories/user-levels.js", () => ({
  getUserLevel: (...args: unknown[]) => mockGetUserLevel(...args),
  incrementUserExp: (...args: unknown[]) => mockIncrementUserExp(...args),
}));

vi.mock("../../../infra/supabase/repositories/streak-exp-bonuses.js", () => ({
  getStreakExpBonusForStreak: (...args: unknown[]) => mockGetStreakExpBonusForStreak(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-streaks.js", () => ({
  getUserStreak: (...args: unknown[]) => mockGetUserStreak(...args),
}));

vi.mock("../../../domains/user/service/user-level-reward.service.js", () => ({
  grantRewardsForLevel: (...args: unknown[]) => mockGrantRewardsForLevel(...args),
}));

vi.mock("../../../domains/user/service/user-streak-freeze.service.js", () => ({
  grantFreezesForLevel: (...args: unknown[]) => mockGrantFreezesForLevel(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-exp-daily.js", () => ({
  incrementDailyExpWithMilestones: (...args: unknown[]) => mockIncrementDailyExpWithMilestones(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserLevel
    .mockResolvedValueOnce({ total_exp_seconds: 0 })
    .mockResolvedValue({ total_exp_seconds: 100 });
  mockGetUserStreak.mockResolvedValue(null);
  mockGetStreakExpBonusForStreak.mockResolvedValue(null);
  mockIncrementDailyExpWithMilestones.mockResolvedValue(undefined);
});

describe("addCallExp", () => {
  it("returns early when durationSeconds <= 0: no incrementUserExp or incrementDailyExpWithMilestones", async () => {
    await addCallExp("u1", 0);
    await addCallExp("u1", -1);
    expect(mockIncrementUserExp).not.toHaveBeenCalled();
    expect(mockIncrementDailyExpWithMilestones).not.toHaveBeenCalled();
  });

  it("returns early when userId is invalid", async () => {
    await addCallExp("", 60);
    await addCallExp("   ", 60);
    expect(mockIncrementUserExp).not.toHaveBeenCalled();
  });

  it("happy path: incrementUserExp with expToAdd = durationSeconds when no streak bonus", async () => {
    await addCallExp("u1", 120);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 120);
  });

  it("when dateForExpToday provided, calls incrementUserExp and incrementDailyExpWithMilestones", async () => {
    await addCallExp("u1", 100, { dateForExpToday: "2024-06-15" });
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 100);
    expect(mockIncrementDailyExpWithMilestones).toHaveBeenCalledWith("u1", "2024-06-15", 100);
  });

  it("when dateForExpToday not provided, calls only incrementUserExp", async () => {
    await addCallExp("u1", 100);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 100);
    expect(mockIncrementDailyExpWithMilestones).not.toHaveBeenCalled();
  });

  it("streak bonus: getStreakExpBonusForStreak returns bonus -> expToAdd = floor(duration * multiplier)", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 5 });
    mockGetStreakExpBonusForStreak.mockResolvedValue({ bonus_multiplier: 1.5 });
    await addCallExp("u1", 100);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 150);
  });

  it("expSecondsToAdd: uses override and does not read streak for bonus", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 99 });
    mockGetStreakExpBonusForStreak.mockResolvedValue({ bonus_multiplier: 2 });
    await addCallExp("u1", 100, { expSecondsToAdd: 77 });
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 77);
    expect(mockGetUserStreak).not.toHaveBeenCalled();
    expect(mockGetStreakExpBonusForStreak).not.toHaveBeenCalled();
  });

  it("streak bonus: getStreakExpBonusForStreak returns null -> no bonus", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 5 });
    mockGetStreakExpBonusForStreak.mockResolvedValue(null);
    await addCallExp("u1", 100);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 100);
  });

  it("level-up: when levelAfter > levelBefore, calls grantRewardsForLevel and grantFreezesForLevel", async () => {
    mockGetUserLevel
      .mockReset()
      .mockResolvedValueOnce({ total_exp_seconds: 0 })
      .mockResolvedValue({ total_exp_seconds: 300 });
    await addCallExp("u1", 300);
    expect(mockGrantRewardsForLevel).toHaveBeenCalledWith("u1", 3);
    expect(mockGrantFreezesForLevel).toHaveBeenCalledWith("u1", 3);
  });

  it("level-up: when level unchanged (same level bucket), does not call grantRewardsForLevel or grantFreezesForLevel", async () => {
    mockGetUserLevel.mockReset().mockResolvedValueOnce({ total_exp_seconds: 1000 }).mockResolvedValue({ total_exp_seconds: 1050 });
    await addCallExp("u1", 50);
    expect(mockGrantRewardsForLevel).not.toHaveBeenCalled();
    expect(mockGrantFreezesForLevel).not.toHaveBeenCalled();
  });

  it("repo throw propagates", async () => {
    mockGetUserLevel.mockRejectedValue(new Error("db error"));
    await expect(addCallExp("u1", 100)).rejects.toThrow("db error");
  });
});

describe("computeExpSecondsForCallDuration", () => {
  it("returns 0 when durationSeconds <= 0 or userId invalid", async () => {
    expect(await computeExpSecondsForCallDuration("u1", 0)).toBe(0);
    expect(await computeExpSecondsForCallDuration("u1", -1)).toBe(0);
    expect(await computeExpSecondsForCallDuration("", 60)).toBe(0);
    expect(mockGetUserStreak).not.toHaveBeenCalled();
  });

  it("returns duration when no streak bonus", async () => {
    mockGetUserStreak.mockResolvedValue(null);
    expect(await computeExpSecondsForCallDuration("u1", 120)).toBe(120);
  });

  it("applies streak multiplier like addCallExp", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 3 });
    mockGetStreakExpBonusForStreak.mockResolvedValue({ bonus_multiplier: 1.25 });
    expect(await computeExpSecondsForCallDuration("u1", 100)).toBe(125);
  });
});

describe("getUserLevelData", () => {
  it("returns null when userId is invalid", async () => {
    expect(await getUserLevelData("")).toBeNull();
    expect(await getUserLevelData("   ")).toBeNull();
  });

  it("when getUserLevel returns null, returns UserLevel with calculateLevelFromExp(0)", async () => {
    mockGetUserLevel.mockReset().mockResolvedValue(null);
    const r = await getUserLevelData("u1");
    expect(r).not.toBeNull();
    expect(r?.userId).toBe("u1");
    expect(r?.totalExpSeconds).toBe(0);
    expect(r?.level).toBe(1);
    expect(r?.expToNextLevel).toBe(300);
    expect(r?.createdAt).toBeDefined();
    expect(r?.updatedAt).toBeDefined();
  });

  it("when getUserLevel returns record, returns UserLevel with calculateLevelFromExp(record.total_exp_seconds)", async () => {
    mockGetUserLevel.mockReset().mockResolvedValue({
      user_id: "u1",
      total_exp_seconds: 300,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    } as any);
    const r = await getUserLevelData("u1");
    expect(r?.userId).toBe("u1");
    expect(r?.totalExpSeconds).toBe(300);
    expect(r?.level).toBeGreaterThanOrEqual(1);
  });

  it("when getUserLevel throws, rethrows", async () => {
    mockGetUserLevel.mockReset().mockRejectedValue(new Error("db"));
    await expect(getUserLevelData("u1")).rejects.toThrow("db");
  });
});
