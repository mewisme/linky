import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUserReport,
  listReports,
  updateReportById,
} from "../../../domains/reports/service/reports.service.js";

const mockCreateReport = vi.fn();
const mockGetReports = vi.fn();
const mockUpdateReport = vi.fn();
const mockGetOrSet = vi.fn();
const mockInvalidateByPrefix = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../infra/supabase/repositories/reports.js", () => ({
  createReport: (...args: unknown[]) => mockCreateReport(...args),
  getReports: (...args: unknown[]) => mockGetReports(...args),
  updateReport: (...args: unknown[]) => mockUpdateReport(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  getOrSet: (...args: unknown[]) => mockGetOrSet(...args),
  invalidateByPrefix: (...args: unknown[]) => mockInvalidateByPrefix(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrSet.mockImplementation((_k: string, _ttl: number, fn: () => Promise<unknown>) => fn());
});

describe("createUserReport", () => {
  it("calls createReport with status pending and invalidates admin:reports: prefix", async () => {
    const created = { id: "r1", reporter_user_id: "u1", reported_user_id: "u2", status: "pending" };
    mockCreateReport.mockResolvedValue(created);

    const result = await createUserReport({
      reporterUserId: "u1",
      reportedUserId: "u2",
      reason: "spam",
    });

    expect(result).toEqual(created);
    expect(mockCreateReport).toHaveBeenCalledWith({
      reporter_user_id: "u1",
      reported_user_id: "u2",
      reason: "spam",
      status: "pending",
    });
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:reports:");
  });
});

describe("listReports", () => {
  it("delegates to getReports via getOrSet with filters", async () => {
    const list = { data: [{ id: "r1" }], count: 1 };
    mockGetReports.mockResolvedValue(list);

    const result = await listReports({
      limit: 10,
      offset: 0,
      status: "pending",
      reporterUserId: "u1",
      reportedUserId: "u2",
    });

    expect(result).toEqual(list);
    expect(mockGetOrSet).toHaveBeenCalledOnce();
    expect(mockGetReports).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      status: "pending",
      reporterUserId: "u1",
      reportedUserId: "u2",
    });
  });
});

describe("updateReportById", () => {
  it("calls updateReport and invalidates admin:reports: prefix", async () => {
    const updated = { id: "r1", status: "resolved" };
    mockUpdateReport.mockResolvedValue(updated);

    const result = await updateReportById("r1", { status: "resolved" });

    expect(result).toEqual(updated);
    expect(mockUpdateReport).toHaveBeenCalledWith("r1", expect.any(Object));
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:reports:");
  });

  it("when updateReport throws, does not call invalidateByPrefix", async () => {
    mockUpdateReport.mockRejectedValue(new Error("db"));

    await expect(updateReportById("r1", { status: "resolved" })).rejects.toThrow("db");
    expect(mockInvalidateByPrefix).not.toHaveBeenCalled();
  });
});
