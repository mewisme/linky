import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { generateText } from "@/infra/ollama/cloud.service.js";
import { REPORT_SUMMARY_PROMPT_VERSION, buildReportSummaryPrompt } from "@/infra/ollama/prompt.js";
import { fetchReportWithContext } from "@/domains/reports/service/reports.service.js";
import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { hashFilters } from "@/infra/redis/cache/hash.js";
import { config } from "@/config/index.js";
import { getReportAiSummaryByReportId, upsertReportAiSummary } from "@/infra/supabase/repositories/report-ai-summaries.js";

import type {
  ReportAiSummarySeverity,
  ReportAiSummaryStatus,
} from "@/domains/reports/types/report-ai-summary.types.js";
import { Json } from "@/types/supabase.js";

const logger = createLogger("api:reports:ai-summary:service");

const LOCK_TTL_SECONDS = 90;
const COOLDOWN_SECONDS = 20 * 60;

const LOCK_PREFIX = "ai:report-summary:lock:";
const COOLDOWN_PREFIX = "ai:report-summary:cooldown:";

function safeParseJsonObject(input: string): unknown | null {
  const trimmed = input.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isSeverity(value: unknown): value is ReportAiSummarySeverity {
  return value === "low" || value === "medium" || value === "high" || value === "critical";
}

function normalizeText(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}…`;
}

function computeDedupeHash(params: {
  reportId: string;
  reportUpdatedAt: string;
  contextCreatedAt: string | null;
}): string {
  return hashFilters({
    reportId: params.reportId,
    reportUpdatedAt: params.reportUpdatedAt,
    contextCreatedAt: params.contextCreatedAt,
    promptVersion: REPORT_SUMMARY_PROMPT_VERSION,
    model: config.ollamaCloudModel,
  });
}

async function acquireLock(reportId: string): Promise<boolean> {
  if (!redisClient.isOpen) return true;

  const key = `${LOCK_PREFIX}${reportId}`;
  const ok = await withRedisTimeout(
    async () => await redisClient.set(key, "1", { NX: true, EX: LOCK_TTL_SECONDS }),
    "report-ai-summary-lock",
  );
  return ok === "OK";
}

async function inCooldown(reportId: string): Promise<boolean> {
  if (!redisClient.isOpen) return false;
  const key = `${COOLDOWN_PREFIX}${reportId}`;
  const v = await withRedisTimeout(async () => await redisClient.get(key), "report-ai-summary-cooldown-get");
  return v === "1";
}

async function setCooldown(reportId: string): Promise<void> {
  if (!redisClient.isOpen) return;
  const key = `${COOLDOWN_PREFIX}${reportId}`;
  await withRedisTimeout(async () => {
    await redisClient.set(key, "1", { EX: COOLDOWN_SECONDS });
  }, "report-ai-summary-cooldown-set");
}

export async function generateReportAiSummary(reportId: string, options?: { force?: boolean }): Promise<void> {
  const force = options?.force === true;

  const reportWithContext = await fetchReportWithContext(reportId);
  if (!reportWithContext) return;

  const dedupeHash = computeDedupeHash({
    reportId,
    reportUpdatedAt: reportWithContext.updated_at,
    contextCreatedAt: reportWithContext.context?.created_at ?? null,
  });

  const existing = await getReportAiSummaryByReportId(reportId);
  if (!force && existing?.status === "ready" && existing.prompt_version === dedupeHash) {
    return;
  }

  if (!force && (await inCooldown(reportId))) {
    return;
  }

  const locked = await acquireLock(reportId);
  if (!locked) return;

  await upsertReportAiSummary({
    report_id: reportId,
    status: "pending" as ReportAiSummaryStatus,
    summary: null,
    severity: null,
    suggested_action: null,
    model: config.ollamaCloudModel ?? null,
    prompt_version: dedupeHash,
    raw_json: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  });

  try {
    const prompt = buildReportSummaryPrompt({
      reportReason: reportWithContext.reason,
      contextJson: reportWithContext.context ?? null,
    });

    const text = await generateText(prompt, { timeoutMs: 45000 });
    const json = safeParseJsonObject(text);
    const obj = (json ?? {}) as Record<string, unknown>;

    const summary = normalizeText(obj.summary, 260);
    const suggestedAction = normalizeText(obj.suggested_action, 500);
    const severity = obj.severity;

    if (!summary || !suggestedAction || !isSeverity(severity)) {
      throw new Error("Invalid model output shape for report AI summary");
    }

    await upsertReportAiSummary({
      report_id: reportId,
      status: "ready" as ReportAiSummaryStatus,
      summary,
      severity,
      suggested_action: suggestedAction,
      model: config.ollamaCloudModel ?? null,
      prompt_version: dedupeHash,
      raw_json: obj as Json,
      error_message: null,
      updated_at: new Date().toISOString(),
    });

    await setCooldown(reportId);
  } catch (error) {
    logger.error(toLoggableError(error), "Failed generating report AI summary: %s", reportId);
    await upsertReportAiSummary({
      report_id: reportId,
      status: "failed" as ReportAiSummaryStatus,
      summary: null,
      severity: null,
      suggested_action: null,
      model: config.ollamaCloudModel ?? null,
      prompt_version: dedupeHash,
      raw_json: null,
      error_message: toLoggableError(error).message,
      updated_at: new Date().toISOString(),
    });
    await setCooldown(reportId);
  }
}

