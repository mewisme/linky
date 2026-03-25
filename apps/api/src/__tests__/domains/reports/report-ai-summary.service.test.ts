import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashFilters } from "../../../infra/redis/cache/hash.js";
import { REPORT_SUMMARY_PROMPT_VERSION } from "../../../infra/ollama/prompt.js";

const mockGetReportWithContext = vi.fn();
const mockGenerateText = vi.fn();
const mockGetAiSummaryByReportId = vi.fn();
const mockUpsertAiSummary = vi.fn();

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("../../../domains/reports/service/reports.service.js", () => ({
  fetchReportWithContext: (...args: unknown[]) => mockGetReportWithContext(...args),
}));

vi.mock("../../../infra/ollama/cloud.service.js", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("../../../infra/supabase/repositories/report-ai-summaries.js", () => ({
  getReportAiSummaryByReportId: (...args: unknown[]) => mockGetAiSummaryByReportId(...args),
  upsertReportAiSummary: (...args: unknown[]) => mockUpsertAiSummary(...args),
}));

vi.mock("../../../infra/redis/client.js", () => ({
  redisClient: {
    isOpen: true,
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

vi.mock("../../../infra/redis/timeout-wrapper.js", () => ({
  withRedisTimeout: async (op: () => Promise<unknown>) => await op(),
}));

vi.mock("../../../config/index.js", () => ({
  config: {
    ollamaCloudModel: "ministral-3:14b",
  },
}));

import { generateReportAiSummary } from "../../../domains/reports/service/report-ai-summary.service.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue("OK");
  mockGetAiSummaryByReportId.mockResolvedValue(null);
});

describe("generateReportAiSummary", () => {
  it("no-ops when report not found", async () => {
    mockGetReportWithContext.mockResolvedValue(null);
    await generateReportAiSummary("r1");
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(mockUpsertAiSummary).not.toHaveBeenCalled();
  });

  it("skips when already ready with same prompt_version and not forced", async () => {
    mockGetReportWithContext.mockResolvedValue({
      id: "r1",
      reason: "spam",
      updated_at: "2026-03-25T00:00:00.000Z",
      context: { created_at: "2026-03-25T00:00:00.000Z" },
    });

    const dedupeHash = hashFilters({
      reportId: "r1",
      reportUpdatedAt: "2026-03-25T00:00:00.000Z",
      contextCreatedAt: "2026-03-25T00:00:00.000Z",
      promptVersion: REPORT_SUMMARY_PROMPT_VERSION,
      model: "ministral-3:14b",
    });

    mockGetAiSummaryByReportId.mockResolvedValue({
      report_id: "r1",
      status: "ready",
      prompt_version: dedupeHash,
    });

    await generateReportAiSummary("r1");
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("writes ready row when model returns valid JSON", async () => {
    mockGetReportWithContext.mockResolvedValue({
      id: "r1",
      reason: "harassment",
      updated_at: "2026-03-25T00:00:00.000Z",
      context: { created_at: "2026-03-25T00:00:00.000Z" },
    });

    mockGetAiSummaryByReportId.mockResolvedValue({
      report_id: "r1",
      status: "failed",
      prompt_version: "old",
    });

    mockGenerateText.mockResolvedValue(
      JSON.stringify({
        summary: "User reports harassment. Context present.",
        severity: "high",
        suggested_action: "Review chat snapshot and warn user if confirmed.",
      }),
    );

    await generateReportAiSummary("r1", { force: true });

    const calls = mockUpsertAiSummary.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    const lastRow = calls[calls.length - 1][0];
    expect(lastRow.status).toBe("ready");
    expect(lastRow.summary).toContain("harassment");
    expect(lastRow.severity).toBe("high");
  });
});

