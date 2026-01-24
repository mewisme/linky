import { describe, it, expect, vi, beforeEach } from "vitest";
import { collectReportContext } from "../../../domains/reports/service/report-context.service.js";

const mockGetCallHistoryById = vi.fn();
const mockGetUserIdByClerkId = vi.fn();

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  getCallHistoryById: (...args: unknown[]) => mockGetCallHistoryById(...args),
  getUserIdByClerkId: (...args: unknown[]) => mockGetUserIdByClerkId(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("collectReportContext", () => {
  it("returns base context with call_id and room_id when no callId or roomId", async () => {
    const deps = { getVideoChatContext: () => null };

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", behaviorFlags: { call_metadata: { reporter_muted: true } } },
      deps
    );

    expect(result.call_id).toBeNull();
    expect(result.room_id).toBeNull();
    expect(result.call_started_at).toBeNull();
    expect(result.reporter_role).toBeNull();
    expect(result.reported_role).toBeNull();
    expect(result.behavior_flags).toEqual({ call_metadata: { reporter_muted: true } });
  });

  it("when callId provided and getCallHistoryById returns record: fills call dates, duration, reporter/reported roles", async () => {
    mockGetCallHistoryById.mockResolvedValue({
      id: "c1",
      started_at: "2024-06-15T10:00:00Z",
      ended_at: "2024-06-15T10:05:00Z",
      duration_seconds: 300,
      caller_id: "ru",
      callee_id: "rpu",
    });

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", callId: "c1" },
      { getVideoChatContext: () => null }
    );

    expect(result.call_id).toBe("c1");
    expect(result.call_started_at).toBe("2024-06-15T10:00:00Z");
    expect(result.call_ended_at).toBe("2024-06-15T10:05:00Z");
    expect(result.duration_seconds).toBe(300);
    expect(result.reporter_role).toBe("caller");
    expect(result.reported_role).toBe("callee");
  });

  it("when reporter is callee: reporter_role callee, reported_role caller", async () => {
    mockGetCallHistoryById.mockResolvedValue({
      id: "c1",
      started_at: "2024-06-15T10:00:00Z",
      ended_at: "2024-06-15T10:05:00Z",
      duration_seconds: 300,
      caller_id: "rpu",
      callee_id: "ru",
    });

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", callId: "c1" },
      { getVideoChatContext: () => null }
    );

    expect(result.reporter_role).toBe("callee");
    expect(result.reported_role).toBe("caller");
  });

  it("when getCallHistoryById returns null: keeps context base values", async () => {
    mockGetCallHistoryById.mockResolvedValue(null);

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", callId: "c1" },
      { getVideoChatContext: () => null }
    );

    expect(result.call_started_at).toBeNull();
    expect(result.reporter_role).toBeNull();
  });

  it("when getCallHistoryById throws: catches and returns context without call data", async () => {
    mockGetCallHistoryById.mockRejectedValue(new Error("db"));

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", callId: "c1" },
      { getVideoChatContext: () => null }
    );

    expect(result.call_started_at).toBeNull();
  });

  it("when roomId provided and getVideoChatContext returns room: sets call_started_at, duration_seconds, reported_at_offset from room", async () => {
    const startedAt = new Date("2024-06-15T10:00:00Z");
    const room = {
      id: "room_1",
      user1: "s1",
      user2: "s2",
      startedAt,
      createdAt: startedAt,
    };
    const mockGetRoom = vi.fn().mockReturnValue(room);
    const mockIo = { sockets: { get: vi.fn().mockReturnValue(null) } };
    const getVideoChatContext = () =>
      ({ rooms: { getRoom: mockGetRoom }, io: mockIo }) as unknown as import("../../../domains/reports/types/report-context.types.js").LiveVideoChatContext;

    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu", roomId: "room_1" },
      { getVideoChatContext }
    );

    expect(result.room_id).toBe("room_1");
    expect(result.call_started_at).toBe(startedAt.toISOString());
    expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
    expect(typeof result.reported_at_offset_seconds).toBe("number");
  });

  it("when behaviorFlags is null: sets behavior_flags to null", async () => {
    const result = await collectReportContext(
      { reporterUserId: "ru", reportedUserId: "rpu" },
      { getVideoChatContext: () => null }
    );

    expect(result.behavior_flags).toBeNull();
  });
});
