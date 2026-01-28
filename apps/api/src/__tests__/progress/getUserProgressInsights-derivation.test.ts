import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserProgressInsights } from "../../domains/user/service/user-progress.service.js";

const RECENT_STREAK_DAYS = 10;

const mockGetOrSet = vi.fn();
const mockGetUserLevelData = vi.fn();
const mockGetUserStreakData = vi.fn();
const mockGetUserStreakHistory = vi.fn();
const mockGetExpToday = vi.fn();
const mockGetUserExpDaily = vi.fn();
const mockGetCallDurationsForUserOnLocalDate = vi.fn();

vi.mock("../../infra/redis/cache/index.js", () => ({
  getOrSet: (k: string, _ttl: number, fetch: () => Promise<unknown>) => mockGetOrSet(k, _ttl, fetch),
}));

vi.mock("../../domains/user/service/user-level.service.js", () => ({
  getUserLevelData: (...args: unknown[]) => mockGetUserLevelData(...args),
}));

vi.mock("../../domains/user/service/user-streak.service.js", () => ({
  getUserStreakData: (...args: unknown[]) => mockGetUserStreakData(...args),
  getUserStreakHistory: (...args: unknown[]) => mockGetUserStreakHistory(...args),
}));

vi.mock("../../infra/redis/cache/exp-today.js", () => ({
  getExpToday: (...args: unknown[]) => mockGetExpToday(...args),
}));

vi.mock("../../infra/supabase/repositories/user-exp-daily.js", () => ({
  getUserExpDaily: (...args: unknown[]) => mockGetUserExpDaily(...args),
}));

vi.mock("../../infra/supabase/repositories/call-history.js", () => ({
  getCallDurationsForUserOnLocalDate: (...args: unknown[]) => mockGetCallDurationsForUserOnLocalDate(...args),
}));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2024-06-15T12:00:00Z") });
  mockGetOrSet.mockImplementation((_k: string, _ttl: number, fetch: () => Promise<unknown>) => fetch());
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

describe("getUserProgressInsights derivation", () => {
  const tz = "UTC";
  const todayStr = "2024-06-15";

  describe("currentStreak", () => {
    it("today valid, yesterday invalid -> currentStreak 1", async () => {
      mockGetUserStreakHistory.mockResolvedValue({
        data: [{ date: todayStr, isValid: true }],
        count: 1,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.streak.currentStreak).toBe(1);
    });

    it("today and yesterday valid, 2 days ago invalid -> currentStreak 2", async () => {
      const yesterday = "2024-06-14";
      mockGetUserStreakHistory.mockResolvedValue({
        data: [
          { date: todayStr, isValid: true },
          { date: yesterday, isValid: true },
          { date: "2024-06-13", isValid: false },
        ],
        count: 3,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.streak.currentStreak).toBe(2);
    });
  });

  describe("streakStatus", () => {
    it("currentStreak>0 and isTodayStreakComplete -> active", async () => {
      mockGetUserStreakHistory.mockResolvedValue({
        data: [{ date: todayStr, isValid: true, totalCallSeconds: 400 }],
        count: 1,
      });
      mockGetUserStreakData.mockResolvedValue({
        currentStreak: 1,
        longestStreak: 1,
        lastValidDate: todayStr,
        lastContinuationUsedFreeze: false,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.streakStatus).toBe("active");
    });

    it("currentStreak>0 and lastContinuationUsedFreeze and not today complete -> frozen", async () => {
      mockGetUserStreakHistory.mockResolvedValue({
        data: [{ date: todayStr, isValid: true, totalCallSeconds: 100 }],
        count: 1,
      });
      mockGetUserStreakData.mockResolvedValue({
        currentStreak: 1,
        longestStreak: 1,
        lastValidDate: todayStr,
        lastContinuationUsedFreeze: true,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.streakStatus).toBe("frozen");
    });

    it("currentStreak 0 -> incomplete", async () => {
      mockGetUserStreakHistory.mockResolvedValue({ data: [], count: 0 });
      mockGetUserStreakData.mockResolvedValue({
        currentStreak: 0,
        longestStreak: 0,
        lastValidDate: null,
        lastContinuationUsedFreeze: false,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.streakStatus).toBe("incomplete");
    });
  });

  describe("progressPercentage", () => {
    it("totalExpForLevel > 0 -> min(100, max(0, (expInCurrentLevel/totalExpForLevel)*100))", async () => {
      mockGetUserLevelData.mockResolvedValue({
        level: 2,
        totalExpSeconds: 150,
        expToNextLevel: 150,
      });

      const r = await getUserProgressInsights("u1", tz);
      const total = 150 + 150;
      expect(r?.expProgress.progressPercentage).toBe(Math.min(100, (150 / total) * 100));
    });

    it("totalExpForLevel === 0 -> 100", async () => {
      mockGetUserLevelData.mockResolvedValue({
        level: 1,
        totalExpSeconds: 0,
        expToNextLevel: 0,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.expProgress.progressPercentage).toBe(100);
    });
  });

  describe("expEarnedToday derivation", () => {
    it("when getExpToday returns 0, getUserExpDaily is called then getCallDurationsForUserOnLocalDate if 0", async () => {
      mockGetExpToday.mockResolvedValue(0);
      mockGetUserExpDaily.mockResolvedValue(0);
      mockGetCallDurationsForUserOnLocalDate.mockResolvedValue(120);

      const r = await getUserProgressInsights("u1", tz);

      expect(mockGetUserExpDaily).toHaveBeenCalledWith("u1", todayStr);
      expect(mockGetCallDurationsForUserOnLocalDate).toHaveBeenCalledWith("u1", todayStr, tz);
      expect(r?.expEarnedToday).toBe(120);
    });

    it("when getExpToday returns 0 and getUserExpDaily returns value, expEarnedToday equals that and getCallDurations not called", async () => {
      mockGetExpToday.mockResolvedValue(0);
      mockGetUserExpDaily.mockResolvedValue(80);
      mockGetCallDurationsForUserOnLocalDate.mockClear();

      const r = await getUserProgressInsights("u1", tz);

      expect(mockGetUserExpDaily).toHaveBeenCalledWith("u1", todayStr);
      expect(mockGetCallDurationsForUserOnLocalDate).not.toHaveBeenCalled();
      expect(r?.expEarnedToday).toBe(80);
    });

    it("when getExpToday returns >0, getUserExpDaily and getCallDurations are not called", async () => {
      mockGetExpToday.mockResolvedValue(50);
      mockGetUserExpDaily.mockClear();
      mockGetCallDurationsForUserOnLocalDate.mockClear();

      await getUserProgressInsights("u1", tz);

      expect(mockGetUserExpDaily).not.toHaveBeenCalled();
      expect(mockGetCallDurationsForUserOnLocalDate).not.toHaveBeenCalled();
    });

    it("expEarnedToday is capped at totalExpSeconds", async () => {
      mockGetUserLevelData.mockResolvedValue({
        level: 2,
        totalExpSeconds: 100,
        expToNextLevel: 200,
      });
      mockGetExpToday.mockResolvedValue(0);
      mockGetUserExpDaily.mockResolvedValue(0);
      mockGetCallDurationsForUserOnLocalDate.mockResolvedValue(150);

      const r = await getUserProgressInsights("u1", tz);

      expect(r?.expEarnedToday).toBe(100);
    });
  });

  describe("recentStreakDays", () => {
    it("has length RECENT_STREAK_DAYS and dates consistent with currentStreak", async () => {
      mockGetUserStreakHistory.mockResolvedValue({
        data: [{ date: todayStr, isValid: true }],
        count: 1,
      });

      const r = await getUserProgressInsights("u1", tz);
      expect(r?.recentStreakDays).toHaveLength(RECENT_STREAK_DAYS);
      expect(r?.recentStreakDays?.[0]?.date).toBe(todayStr);
      expect(r?.recentStreakDays?.[0]?.isValid).toBe(true);
    });
  });
});
