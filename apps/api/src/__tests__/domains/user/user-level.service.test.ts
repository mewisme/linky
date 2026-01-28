import { addCallExp, getUserLevelData } from "../../../domains/user/service/user-level.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserLevel = vi.fn();
const mockIncrementUserExp = vi.fn();
const mockGetUserStreak = vi.fn();
const mockGetStreakExpBonusForStreak = vi.fn();
const mockGetActiveFavoriteExpBoostRules = vi.fn();
const mockCheckFavoriteExists = vi.fn();
const mockGrantRewardsForLevel = vi.fn();
const mockGrantFreezesForLevel = vi.fn();
const mockInvalidate = vi.fn();
const mockInvalidateByPrefix = vi.fn();
const mockIncrExpToday = vi.fn();
const mockIncrementUserExpDaily = vi.fn();

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

vi.mock("../../../infra/supabase/repositories/favorite-exp-boost-rules.js", () => ({
  getActiveFavoriteExpBoostRules: (...args: unknown[]) => mockGetActiveFavoriteExpBoostRules(...args),
}));

vi.mock("../../../infra/supabase/repositories/favorites.js", () => ({
  checkFavoriteExists: (...args: unknown[]) => mockCheckFavoriteExists(...args),
}));

vi.mock("../../../domains/user/service/user-level-reward.service.js", () => ({
  grantRewardsForLevel: (...args: unknown[]) => mockGrantRewardsForLevel(...args),
}));

vi.mock("../../../domains/user/service/user-streak-freeze.service.js", () => ({
  grantFreezesForLevel: (...args: unknown[]) => mockGrantFreezesForLevel(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
  invalidateByPrefix: (...args: unknown[]) => mockInvalidateByPrefix(...args),
}));

vi.mock("../../../infra/redis/cache/exp-today.js", () => ({
  incrExpToday: (...args: unknown[]) => mockIncrExpToday(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-exp-daily.js", () => ({
  incrementUserExpDaily: (...args: unknown[]) => mockIncrementUserExpDaily(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserLevel
    .mockResolvedValueOnce({ total_exp_seconds: 0 })
    .mockResolvedValue({ total_exp_seconds: 100 });
  mockGetUserStreak.mockResolvedValue(null);
  mockGetStreakExpBonusForStreak.mockResolvedValue(null);
  mockGetActiveFavoriteExpBoostRules.mockResolvedValue(null);
  mockInvalidate.mockResolvedValue(undefined);
  mockInvalidateByPrefix.mockResolvedValue(undefined);
  mockIncrExpToday.mockResolvedValue(undefined);
  mockIncrementUserExpDaily.mockResolvedValue(undefined);
});

describe("addCallExp", () => {
  it("returns early when durationSeconds <= 0: no incrementUserExp, incrExpToday, incrementUserExpDaily, invalidate", async () => {
    await addCallExp("u1", 0);
    await addCallExp("u1", -1);
    expect(mockIncrementUserExp).not.toHaveBeenCalled();
    expect(mockIncrExpToday).not.toHaveBeenCalled();
    expect(mockIncrementUserExpDaily).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockInvalidateByPrefix).not.toHaveBeenCalled();
  });

  it("returns early when userId is invalid", async () => {
    await addCallExp("", 60);
    await addCallExp("   ", 60);
    expect(mockIncrementUserExp).not.toHaveBeenCalled();
  });

  it("happy path: incrementUserExp with expToAdd = durationSeconds when no streak/favorite bonus", async () => {
    await addCallExp("u1", 120);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 120);
  });

  it("when dateForExpToday provided, calls incrementUserExpDaily and incrExpToday with userId, dateForExpToday, expToAdd", async () => {
    await addCallExp("u1", 100, { dateForExpToday: "2024-06-15" });
    expect(mockIncrementUserExpDaily).toHaveBeenCalledWith("u1", "2024-06-15", 100);
    expect(mockIncrExpToday).toHaveBeenCalledWith("u1", "2024-06-15", 100);
  });

  it("when dateForExpToday not provided, does not call incrementUserExpDaily or incrExpToday", async () => {
    await addCallExp("u1", 100);
    expect(mockIncrementUserExpDaily).not.toHaveBeenCalled();
    expect(mockIncrExpToday).not.toHaveBeenCalled();
  });

  it("when timezone provided, calls invalidate with userProgress key", async () => {
    await addCallExp("u1", 100, { timezone: "Europe/Paris" });
    expect(mockInvalidate).toHaveBeenCalledWith("user:progress:u1:Europe/Paris");
    expect(mockInvalidateByPrefix).not.toHaveBeenCalled();
  });

  it("when timezone not provided, calls invalidateByPrefix user:progress:userId:", async () => {
    await addCallExp("u1", 100);
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("user:progress:u1:");
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("streak bonus: getStreakExpBonusForStreak returns bonus -> expToAdd = floor(duration * multiplier)", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 5 });
    mockGetStreakExpBonusForStreak.mockResolvedValue({ bonus_multiplier: 1.5 });
    await addCallExp("u1", 100);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 150);
  });

  it("streak bonus: getStreakExpBonusForStreak returns null -> no bonus", async () => {
    mockGetUserStreak.mockResolvedValue({ current_streak: 5 });
    mockGetStreakExpBonusForStreak.mockResolvedValue(null);
    await addCallExp("u1", 100);
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 100);
  });

  it("favorite: both favorited -> mutual_multiplier", async () => {
    mockCheckFavoriteExists.mockResolvedValue(true).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockGetActiveFavoriteExpBoostRules.mockResolvedValue({ mutual_multiplier: 2, one_way_multiplier: 1.5 });
    await addCallExp("u1", 100, { counterpartUserId: "u2" });
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 200);
  });

  it("favorite: one-way -> one_way_multiplier", async () => {
    mockCheckFavoriteExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockGetActiveFavoriteExpBoostRules.mockResolvedValue({ mutual_multiplier: 2, one_way_multiplier: 1.5 });
    await addCallExp("u1", 100, { counterpartUserId: "u2" });
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 150);
  });

  it("favorite: neither -> no boost", async () => {
    mockCheckFavoriteExists.mockResolvedValue(false);
    mockGetActiveFavoriteExpBoostRules.mockResolvedValue({ mutual_multiplier: 2, one_way_multiplier: 1.5 });
    await addCallExp("u1", 100, { counterpartUserId: "u2" });
    expect(mockIncrementUserExp).toHaveBeenCalledWith("u1", 100);
  });

  it("favorite: getActiveFavoriteExpBoostRules returns null -> no boost", async () => {
    mockCheckFavoriteExists.mockResolvedValue(true);
    mockGetActiveFavoriteExpBoostRules.mockResolvedValue(null);
    await addCallExp("u1", 100, { counterpartUserId: "u2" });
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
