import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordCallHistoryInDatabase } from "../../../domains/video-chat/service/call-history.service.js";

const mockGetUserCountry = vi.fn();
const mockCreateCallHistory = vi.fn();

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  createCallHistory: (...args: unknown[]) => mockCreateCallHistory(...args),
  getUserCountry: (...args: unknown[]) => mockGetUserCountry(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserCountry.mockResolvedValue("US");
  mockCreateCallHistory.mockResolvedValue({});
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

  it("persists nonzero duration without applying progression (handled in call-ended context)", async () => {
    await recordCallHistoryInDatabase({ ...baseParams, durationSeconds: 300 });

    expect(mockCreateCallHistory).toHaveBeenCalledWith({
      callerId: "c1",
      calleeId: "c2",
      callerCountry: "US",
      calleeCountry: "US",
      startedAt: baseParams.startedAt,
      endedAt: baseParams.endedAt,
      durationSeconds: 300,
    });
  });
});
