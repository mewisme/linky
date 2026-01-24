import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPageView,
  getRecentVisits,
  getVisitStats,
} from "../../../domains/admin/service/admin-visits.service.js";

const mockCreatePageViewQuery = vi.fn();
const mockCreateVisitorQuery = vi.fn();
const mockGetVisitor = vi.fn();
const mockIncrementVisitorQuery = vi.fn();
const mockGetPageViews = vi.fn();
const mockGetVisitorStats = vi.fn();
const mockGetTopPages = vi.fn();

vi.mock("../../../infra/supabase/repositories/index.js", () => ({
  createPageView: (...args: unknown[]) => mockCreatePageViewQuery(...args),
  createVisitor: (...args: unknown[]) => mockCreateVisitorQuery(...args),
  getVisitor: (...args: unknown[]) => mockGetVisitor(...args),
  incrementVisitor: (...args: unknown[]) => mockIncrementVisitorQuery(...args),
  getPageViews: (...args: unknown[]) => mockGetPageViews(...args),
  getVisitorStats: (...args: unknown[]) => mockGetVisitorStats(...args),
  getTopPages: (...args: unknown[]) => mockGetTopPages(...args),
}));

vi.mock("../../../infra/supabase/client.js", () => ({
  supabase: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPageView", () => {
  it("returns { success: false } when createPageViewQuery returns false", async () => {
    mockCreatePageViewQuery.mockResolvedValue(false);

    const result = await createPageView({ path: "/", ip: "1.2.3.4" });

    expect(result).toEqual({ success: false });
    expect(mockGetVisitor).not.toHaveBeenCalled();
    expect(mockIncrementVisitorQuery).not.toHaveBeenCalled();
    expect(mockCreateVisitorQuery).not.toHaveBeenCalled();
  });

  it("when createPageViewQuery succeeds and getVisitor returns existing: calls incrementVisitorQuery", async () => {
    mockCreatePageViewQuery.mockResolvedValue(true);
    mockGetVisitor.mockResolvedValue({ ip: "1.2.3.4" });
    mockIncrementVisitorQuery.mockResolvedValue(undefined);

    const result = await createPageView({ path: "/x", ip: "1.2.3.4" });

    expect(result).toEqual({ success: true });
    expect(mockIncrementVisitorQuery).toHaveBeenCalledWith("1.2.3.4");
    expect(mockCreateVisitorQuery).not.toHaveBeenCalled();
  });

  it("when createPageViewQuery succeeds and getVisitor returns null: calls createVisitorQuery", async () => {
    mockCreatePageViewQuery.mockResolvedValue(true);
    mockGetVisitor.mockResolvedValue(null);
    mockCreateVisitorQuery.mockResolvedValue(undefined);

    const result = await createPageView({ path: "/y", ip: "5.6.7.8" });

    expect(result).toEqual({ success: true });
    expect(mockCreateVisitorQuery).toHaveBeenCalledWith("5.6.7.8");
    expect(mockIncrementVisitorQuery).not.toHaveBeenCalled();
  });
});

describe("getRecentVisits", () => {
  it("delegates to getPageViews with page, limit and optional path", async () => {
    mockGetPageViews.mockResolvedValue({ data: [], pagination: { total: 0 } });

    await getRecentVisits({ page: 1, limit: 10, path: "/about" });

    expect(mockGetPageViews).toHaveBeenCalledWith({ page: 1, limit: 10, path: "/about" });
  });

  it("when params.ip provided: filters result.data by view.ip", async () => {
    mockGetPageViews.mockResolvedValue({
      data: [
        { id: "1", ip: "1.2.3.4", path: "/" },
        { id: "2", ip: "5.6.7.8", path: "/" },
        { id: "3", ip: "1.2.3.4", path: "/x" },
      ],
      pagination: { total: 3 },
    });

    const result = await getRecentVisits({ page: 1, limit: 10, ip: "1.2.3.4" });

    expect(result.data).toHaveLength(2);
    expect((result.data as { ip: string }[]).every((v) => v.ip === "1.2.3.4")).toBe(true);
    expect(result.pagination).toEqual({ total: 3 });
  });

  it("when params.ip not provided: returns unfiltered result.data", async () => {
    const data = [{ id: "1", ip: "a" }, { id: "2", ip: "b" }];
    mockGetPageViews.mockResolvedValue({ data, pagination: { total: 2 } });

    const result = await getRecentVisits({ page: 1, limit: 10 });

    expect(result.data).toEqual(data);
  });
});

describe("getVisitStats", () => {
  it("returns visitors and topPages from getVisitorStats and getTopPages(10)", async () => {
    const visitors = { total: 100 };
    const topPages = [{ path: "/", count: 50 }];
    mockGetVisitorStats.mockResolvedValue(visitors);
    mockGetTopPages.mockResolvedValue(topPages);

    const result = await getVisitStats();

    expect(result).toEqual({ visitors, topPages });
    expect(mockGetTopPages).toHaveBeenCalledWith(10);
  });
});
