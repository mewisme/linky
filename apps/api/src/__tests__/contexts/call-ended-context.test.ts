import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyCallEndedProgress } from "@/contexts/call-ended-context.js";

const mockInvalidate = vi.fn();
const mockAddCallExp = vi.fn();
const mockAddCallDurationToStreak = vi.fn();

vi.mock("@/domains/user/index.js", () => ({
  addCallExp: (...args: unknown[]) => mockAddCallExp(...args),
  addCallDurationToStreak: (...args: unknown[]) => mockAddCallDurationToStreak(...args),
}));

vi.mock("@/infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockInvalidate.mockResolvedValue(undefined);
  mockAddCallExp.mockResolvedValue(undefined);
  mockAddCallDurationToStreak.mockResolvedValue(null);
});

describe("applyCallEndedProgress", () => {
  const baseParams = {
    callerId: "c1",
    calleeId: "c2",
    endedAt: new Date("2024-06-15T10:05:00Z"),
    callerTimezone: "America/New_York",
    calleeTimezone: "Europe/Paris",
  };

  it("when durationSeconds <= 0: no invalidate, addCallExp, or addCallDurationToStreak", async () => {
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 0 });

    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockAddCallExp).not.toHaveBeenCalled();
    expect(mockAddCallDurationToStreak).not.toHaveBeenCalled();
  });

  it("when durationSeconds > 0: invalidate both, addCallExp for both with timezone/counterpart/dateForExpToday, addCallDurationToStreak", async () => {
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300 });

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

  it("ensures both users receive updates symmetrically - caller and callee both get EXP and streak updates", async () => {
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300 });

    const callerExpCalls = mockAddCallExp.mock.calls.filter((call) => call[0] === "c1");
    const calleeExpCalls = mockAddCallExp.mock.calls.filter((call) => call[0] === "c2");

    expect(callerExpCalls.length).toBe(1);
    expect(calleeExpCalls.length).toBe(1);

    const callerStreakCalls = mockAddCallDurationToStreak.mock.calls.filter((call) => call[0] === "c1");
    const calleeStreakCalls = mockAddCallDurationToStreak.mock.calls.filter((call) => call[0] === "c2");

    expect(callerStreakCalls.length).toBe(1);
    expect(calleeStreakCalls.length).toBe(1);

    const callerInvalidateCalls = mockInvalidate.mock.calls.filter(
      (call) => call[0] === "user:progress:c1:America/New_York",
    );
    const calleeInvalidateCalls = mockInvalidate.mock.calls.filter(
      (call) => call[0] === "user:progress:c2:Europe/Paris",
    );

    expect(callerInvalidateCalls.length).toBeGreaterThanOrEqual(1);
    expect(calleeInvalidateCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("handles errors gracefully - if one user's update fails, the other still succeeds", async () => {
    mockAddCallExp.mockRejectedValueOnce(new Error("Caller EXP update failed")).mockResolvedValueOnce(undefined);

    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300 });

    expect(mockAddCallExp).toHaveBeenCalledTimes(2);
    expect(mockAddCallDurationToStreak).toHaveBeenCalledTimes(2);
  });

  it("onStreakCompleted: called for both users when both return firstTimeValid", async () => {
    mockAddCallDurationToStreak
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 2, date: "2024-06-15" })
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 3, date: "2024-06-15" });

    const onStreakCompleted = vi.fn();
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300, onStreakCompleted });

    expect(onStreakCompleted).toHaveBeenCalledWith("c1", { streakCount: 2, date: "2024-06-15" });
    expect(onStreakCompleted).toHaveBeenCalledWith("c2", { streakCount: 3, date: "2024-06-15" });
    expect(onStreakCompleted).toHaveBeenCalledTimes(2);
  });

  it("onStreakCompleted: called for caller when addCallDurationToStreak returns firstTimeValid", async () => {
    mockAddCallDurationToStreak
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 2, date: "2024-06-15" })
      .mockResolvedValueOnce(null);

    const onStreakCompleted = vi.fn();
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300, onStreakCompleted });

    expect(onStreakCompleted).toHaveBeenCalledWith("c1", { streakCount: 2, date: "2024-06-15" });
  });

  it("onStreakCompleted: called for callee when addCallDurationToStreak returns firstTimeValid", async () => {
    mockAddCallDurationToStreak
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ firstTimeValid: true, streakCount: 1, date: "2024-06-15" });

    const onStreakCompleted = vi.fn();
    await applyCallEndedProgress({ ...baseParams, durationSeconds: 300, onStreakCompleted });

    expect(onStreakCompleted).toHaveBeenCalledWith("c2", { streakCount: 1, date: "2024-06-15" });
  });
});
