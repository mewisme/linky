import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  addCallDurationToStreak,
  getUserStreakData,
  getUserStreakHistory,
  getUserStreakCalendar,
} from "../../../domains/user/service/user-streak.service.js";

const mockUpsertUserStreakDay = vi.fn();
const mockGetUserStreak = vi.fn();
const mockGetUserStreakDays = vi.fn();
const mockGetUserStreakDaysByMonth = vi.fn();
const mockGetStreakDayByUserAndDate = vi.fn();
const mockClearLastContinuationUsedFreeze = vi.fn();
const mockGetFreezeInventory = vi.fn();
const mockConsumeFreeze = vi.fn();
const mockPrepareStreakFreeze = vi.fn();
const mockGetOrSet = vi.fn();
const mockInvalidate = vi.fn();

vi.mock("../../../infra/supabase/repositories/user-streaks.js", () => ({
  upsertUserStreakDay: (...args: unknown[]) => mockUpsertUserStreakDay(...args),
  getUserStreak: (...args: unknown[]) => mockGetUserStreak(...args),
  getUserStreakDays: (...args: unknown[]) => mockGetUserStreakDays(...args),
  getUserStreakDaysByMonth: (...args: unknown[]) => mockGetUserStreakDaysByMonth(...args),
  getStreakDayByUserAndDate: (...args: unknown[]) => mockGetStreakDayByUserAndDate(...args),
  clearLastContinuationUsedFreeze: (...args: unknown[]) => mockClearLastContinuationUsedFreeze(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-streak-freeze.js", () => ({
  getFreezeInventory: (...args: unknown[]) => mockGetFreezeInventory(...args),
  consumeFreeze: (...args: unknown[]) => mockConsumeFreeze(...args),
  prepareStreakFreeze: (...args: unknown[]) => mockPrepareStreakFreeze(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  getOrSet: (...args: unknown[]) => mockGetOrSet(...args),
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserStreak.mockResolvedValue(null);
  mockGetFreezeInventory.mockResolvedValue({ available_count: 0 });
  mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: false, currentStreak: 0 });
  mockGetStreakDayByUserAndDate.mockResolvedValue(null);
  mockInvalidate.mockResolvedValue(undefined);
  mockGetOrSet.mockImplementation((_k: string, _ttl: number, fetch: () => Promise<unknown>) => fetch());
});

describe("addCallDurationToStreak", () => {
  it("returns null when durationSeconds <= 0: no upsertUserStreakDay, no invalidate", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    expect(await addCallDurationToStreak("u1", 0, d, "UTC")).toBeNull();
    expect(await addCallDurationToStreak("u1", -1, d, "UTC")).toBeNull();
    expect(mockUpsertUserStreakDay).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("returns null when userId is invalid", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    expect(await addCallDurationToStreak("", 60, d, "UTC")).toBeNull();
    expect(await addCallDurationToStreak("   ", 60, d, "UTC")).toBeNull();
    expect(mockUpsertUserStreakDay).not.toHaveBeenCalled();
  });

  it("happy path: upsertUserStreakDay, invalidate userProgress, and when same month invalidate calendar", async () => {
    vi.useFakeTimers({ now: new Date("2024-06-15T12:00:00Z") });
    const d = new Date("2024-06-15T12:00:00Z");
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 1 });

    await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(mockUpsertUserStreakDay).toHaveBeenCalledWith("u1", "2024-06-15", 120);
    expect(mockInvalidate).toHaveBeenCalledWith("user:progress:u1:UTC");
    expect(mockInvalidate).toHaveBeenCalledWith("user:streak:calendar:u1:2024:6:UTC");
    vi.useRealTimers();
  });

  it("one-day gap and available > 0: prepareStreakFreeze(gapDate), consumeFreeze", async () => {
    const d = new Date("2024-06-17T12:00:00Z");
    mockGetUserStreak.mockResolvedValue({ last_valid_date: "2024-06-15" });
    mockGetFreezeInventory.mockResolvedValue({ available_count: 1 });
    mockPrepareStreakFreeze.mockResolvedValue(undefined);
    mockConsumeFreeze.mockResolvedValue(true);
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 2 });
    mockGetStreakDayByUserAndDate.mockResolvedValue({ is_valid: true });

    await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(mockPrepareStreakFreeze).toHaveBeenCalledWith("u1", "2024-06-16");
    expect(mockConsumeFreeze).toHaveBeenCalledWith("u1");
  });

  it("one-day gap but available_count 0: no prepareStreakFreeze, no consumeFreeze", async () => {
    const d = new Date("2024-06-17T12:00:00Z");
    mockGetUserStreak.mockResolvedValue({ last_valid_date: "2024-06-15" });
    mockGetFreezeInventory.mockResolvedValue({ available_count: 0 });
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 1 });

    await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(mockPrepareStreakFreeze).not.toHaveBeenCalled();
    expect(mockConsumeFreeze).not.toHaveBeenCalled();
  });

  it("not one-day gap: no prepareStreakFreeze, no consumeFreeze", async () => {
    const d = new Date("2024-06-18T12:00:00Z");
    mockGetUserStreak.mockResolvedValue({ last_valid_date: "2024-06-15" });
    mockGetFreezeInventory.mockResolvedValue({ available_count: 1 });
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 1 });

    await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(mockPrepareStreakFreeze).not.toHaveBeenCalled();
    expect(mockConsumeFreeze).not.toHaveBeenCalled();
  });

  it("completedValidDayWithoutFreeze: clearLastContinuationUsedFreeze called", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 1 });
    mockGetStreakDayByUserAndDate.mockResolvedValue({ is_valid: true });

    await addCallDurationToStreak("u1", 400, d, "UTC");

    expect(mockClearLastContinuationUsedFreeze).toHaveBeenCalledWith("u1");
  });

  it("returns { firstTimeValid: true, streakCount, date } when result.firstTimeValid", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: true, currentStreak: 3 });

    const r = await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(r).toEqual({ firstTimeValid: true, streakCount: 3, date: "2024-06-15" });
  });

  it("returns null when result.firstTimeValid is false", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    mockUpsertUserStreakDay.mockResolvedValue({ firstTimeValid: false, currentStreak: 0 });

    const r = await addCallDurationToStreak("u1", 120, d, "UTC");

    expect(r).toBeNull();
  });

  it("repo throw propagates", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    mockGetUserStreak.mockRejectedValue(new Error("db"));
    await expect(addCallDurationToStreak("u1", 120, d, "UTC")).rejects.toThrow("db");
  });
});

describe("getUserStreakData", () => {
  it("returns null when userId is invalid", async () => {
    expect(await getUserStreakData("")).toBeNull();
    expect(await getUserStreakData("   ")).toBeNull();
  });

  it("returns null when getUserStreak returns null", async () => {
    mockGetUserStreak.mockResolvedValue(null);
    expect(await getUserStreakData("u1")).toBeNull();
  });

  it("returns UserStreak shape when record exists", async () => {
    mockGetUserStreak.mockResolvedValue({
      user_id: "u1",
      current_streak: 2,
      longest_streak: 5,
      last_valid_date: "2024-06-14",
      last_continuation_used_freeze: false,
      updated_at: "2024-06-14T12:00:00Z",
    });
    const r = await getUserStreakData("u1");
    expect(r).toEqual({
      userId: "u1",
      currentStreak: 2,
      longestStreak: 5,
      lastValidDate: "2024-06-14",
      lastContinuationUsedFreeze: false,
      updatedAt: "2024-06-14T12:00:00Z",
    });
  });
});

describe("getUserStreakHistory", () => {
  it("returns { data: [], count: 0 } when userId is invalid", async () => {
    expect(await getUserStreakHistory("")).toEqual({ data: [], count: 0 });
  });

  it("maps getUserStreakDays result", async () => {
    mockGetUserStreakDays.mockResolvedValue({
      data: [{ id: "x", user_id: "u1", date: "2024-06-15", total_call_seconds: 100, is_valid: true, created_at: "2024-06-15T00:00:00Z" }],
      count: 1,
    });
    const r = await getUserStreakHistory("u1");
    expect(r.data).toHaveLength(1);
    expect(r.data[0]!.date).toBe("2024-06-15");
    expect(r.data[0]!.totalCallSeconds).toBe(100);
    expect(r.count).toBe(1);
  });
});

describe("getUserStreakCalendar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns [] when userId is invalid", async () => {
    expect(await getUserStreakCalendar("", 2024, 6, "UTC")).toEqual([]);
  });

  it("throws when month < 1 or > 12", async () => {
    await expect(getUserStreakCalendar("u1", 2024, 0, "UTC")).rejects.toThrow("Month must be between 1 and 12");
    await expect(getUserStreakCalendar("u1", 2024, 13, "UTC")).rejects.toThrow("Month must be between 1 and 12");
  });

  it("calls getOrSet with correct key/ttl and getUserStreakDaysByMonth in fetch", async () => {
    vi.useFakeTimers({ now: new Date("2024-06-15T12:00:00Z") });
    mockGetUserStreakDaysByMonth.mockResolvedValue([
      { date: "2024-06-01", is_valid: true, total_call_seconds: 100 },
    ]);

    await getUserStreakCalendar("u1", 2024, 6, "UTC");

    expect(mockGetOrSet).toHaveBeenCalledWith(
      "user:streak:calendar:u1:2024:6:UTC",
      90,
      expect.any(Function),
    );
    expect(mockGetUserStreakDaysByMonth).toHaveBeenCalledWith("u1", 2024, 6);
  });
});
