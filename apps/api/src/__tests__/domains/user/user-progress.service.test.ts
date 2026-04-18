import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserProgressInsights } from "../../../domains/user/service/user-progress.service.js";

const mockGetUserLevelData = vi.fn();
const mockGetUserStreakData = vi.fn();
const mockGetUserStreakHistory = vi.fn();
const mockGetExpToday = vi.fn();
const mockGetUserExpDaily = vi.fn();
const mockGetCallDurationsForUserOnLocalDate = vi.fn();

vi.mock("../../../domains/user/service/user-level.service.js", () => ({
  getUserLevelData: (...args: unknown[]) => mockGetUserLevelData(...args),
}));

vi.mock("../../../domains/user/service/user-streak.service.js", () => ({
  getUserStreakData: (...args: unknown[]) => mockGetUserStreakData(...args),
  getUserStreakHistory: (...args: unknown[]) => mockGetUserStreakHistory(...args),
}));

vi.mock("../../../infra/redis/cache/exp-today.js", () => ({
  getExpToday: (...args: unknown[]) => mockGetExpToday(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-exp-daily.js", () => ({
  getUserExpDaily: (...args: unknown[]) => mockGetUserExpDaily(...args),
}));

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  getCallDurationsForUserOnLocalDate: (...args: unknown[]) => mockGetCallDurationsForUserOnLocalDate(...args),
}));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2024-06-15T12:00:00Z") });
  mockGetUserLevelData.mockResolvedValue({
    level: 1,
    totalExpSeconds: 0,
    expToNextLevel: 300,
  });
  mockGetUserStreakData.mockResolvedValue({
    currentStreak: 0,
    longestStreak: 0,
    lastValidDate: null,
    lastContinuationUsedFreeze: false,
  });
  mockGetUserStreakHistory.mockResolvedValue({ data: [], count: 0 });
  mockGetExpToday.mockResolvedValue(0);
  mockGetUserExpDaily.mockResolvedValue(0);
  mockGetCallDurationsForUserOnLocalDate.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getUserProgressInsights", () => {
  it("returns null when userId is invalid", async () => {
    expect(await getUserProgressInsights("", "UTC")).toBeNull();
    expect(await getUserProgressInsights("   ", "UTC")).toBeNull();
  });

  it("when getUserLevelData returns null, fetch returns null", async () => {
    mockGetUserLevelData.mockResolvedValue(null);
    const r = await getUserProgressInsights("u1", "UTC");
    expect(r).toBeNull();
  });

  it("returns composed ProgressInsights shape when mocks return valid data", async () => {
    mockGetUserLevelData.mockResolvedValue({
      level: 1,
      totalExpSeconds: 200,
      expToNextLevel: 0,
    });
    mockGetUserStreakHistory.mockResolvedValue({
      data: [{ date: "2024-06-15", isValid: true, totalCallSeconds: 400 }],
      count: 1,
    });
    mockGetExpToday.mockResolvedValue(100);

    const r = await getUserProgressInsights("u1", "UTC");

    expect(r).not.toBeNull();
    expect(r?.currentLevel).toBe(1);
    expect(r?.expProgress.progressPercentage).toBe(100);
    expect(r?.expEarnedToday).toBe(100);
    expect(r?.streakStatus).toBeDefined();
    expect(r?.todayDate).toBe("2024-06-15");
    expect(r?.recentStreakDays).toHaveLength(7);
    expect(r?.streakRequiredSeconds).toBe(300);
  });

  it("streakIfTodayCompleted matches currentStreak when today is already valid", async () => {
    mockGetUserLevelData.mockResolvedValue({
      level: 1,
      totalExpSeconds: 200,
      expToNextLevel: 0,
    });
    mockGetUserStreakHistory.mockResolvedValue({
      data: [{ date: "2024-06-15", isValid: true, totalCallSeconds: 400 }],
      count: 1,
    });

    const r = await getUserProgressInsights("u1", "UTC");
    expect(r?.streakIfTodayCompleted).toBe(r?.streak.currentStreak);
  });
});
