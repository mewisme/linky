import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordCallHistoryInDatabase } from "../../../domains/video-chat/service/call-history.service.js";

const mockGetUserCountry = vi.fn();
const mockCreateCallHistory = vi.fn();
const mockInvalidate = vi.fn();
const mockAddCallExp = vi.fn();
const mockAddCallDurationToStreak = vi.fn();

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  createCallHistory: (...args: unknown[]) => mockCreateCallHistory(...args),
  getUserCountry: (...args: unknown[]) => mockGetUserCountry(...args),
}));

vi.mock("../../../domains/user/service/user-level.service.js", () => ({
  addCallExp: (...args: unknown[]) => mockAddCallExp(...args),
}));

vi.mock("../../../domains/user/service/user-streak.service.js", () => ({
  addCallDurationToStreak: (...args: unknown[]) => mockAddCallDurationToStreak(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserCountry.mockResolvedValue("US");
  mockCreateCallHistory.mockResolvedValue({});
  mockInvalidate.mockResolvedValue(undefined);
  mockAddCallExp.mockResolvedValue(undefined);
  mockAddCallDurationToStreak.mockResolvedValue(null);
});

describe("recordCallHistoryInDatabase", () => {
  const baseParams = {
    callerId: "c1",
    calleeId: "c2",
    startedAt: new Date("2024-06-15T10:00:00Z"),
    endedAt: new Date("2024-06-15T10:05:00Z"),
    callerTimezone: "America/New_York",
    calleeTimezone: "Europe/Paris",
  };

  it("calls getUserCountry for both, createCallHistory with correct params", async () => {
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 0 });

    expect(mockGetUserCountry).toHaveBeenCalledWith("c1");
    expect(mockGetUserCountry).toHaveBeenCalledWith("c2");
    expect(mockCreateCallHistory).toHaveBeenCalledWith({
      callerId: "c1",
      calleeId: "c2",
      callerCountry: "US",
      calleeCountry: "US",
      startedAt: baseParams.startedAt,
      endedAt: baseParams.endedAt,
      durationSeconds: 0,
    });
  });

  it("when durationSeconds <= 0: createCallHistory only, no invalidate/addCallExp/addCallDurationToStreak", async () => {
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 0 });

    expect(mockCreateCallHistory).toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockAddCallExp).not.toHaveBeenCalled();
    expect(mockAddCallDurationToStreak).not.toHaveBeenCalled();
  });

  it("when durationSeconds > 0: invalidate both, addCallExp for both with timezone/counterpart/dateForExpToday, addCallDurationToStreak", async () => {
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 300 });

    expect(mockInvalidate).toHaveBeenCalledWith("user:progress:c1:America/New_York");
    expect(mockInvalidate).toHaveBeenCalledWith("user:progress:c2:Europe/Paris");

    expect(mockAddCallExp).toHaveBeenCalledWith("c1", 300, {
      timezone: "America/New_York",
      counterpartUserId: "c2",
      dateForExpToday: "2024-06-15",
    });
    expect(mockAddCallExp).toHaveBeenCalledWith("c2", 300, {
      timezone: "Europe/Paris",
      counterpartUserId: "c1",
      dateForExpToday: "2024-06-15",
    });

    expect(mockAddCallDurationToStreak).toHaveBeenCalledWith("c1", 300, baseParams.endedAt, "America/New_York");
    expect(mockAddCallDurationToStreak).toHaveBeenCalledWith("c2", 300, baseParams.endedAt, "Europe/Paris");
  });

  it("onStreakCompleted: called for caller when addCallDurationToStreak returns firstTimeValid", async () => {
    mockAddCallDurationToStreak
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 2, date: "2024-06-15" })
      .mockResolvedValue(null);

    const onStreakCompleted = vi.fn();
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 300, onStreakCompleted });

    expect(onStreakCompleted).toHaveBeenCalledWith("c1", { streakCount: 2, date: "2024-06-15" });
  });

  it("onStreakCompleted: called for callee when addCallDurationToStreak returns firstTimeValid", async () => {
    mockAddCallDurationToStreak
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 1, date: "2024-06-15" });

    const onStreakCompleted = vi.fn();
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 300, onStreakCompleted });

    expect(onStreakCompleted).toHaveBeenCalledWith("c2", { streakCount: 1, date: "2024-06-15" });
  });
});
