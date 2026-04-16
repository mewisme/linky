import { generateReportAiSummary } from "@/domains/reports/service/report-ai-summary.service.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("api:worker:ai:report-ai-summary");

export async function executeReportAiSummaryJob(reportId: string, force: boolean): Promise<void> {
  const t0 = Date.now();
  logger.info("report_ai_summary execute start (reportId=%s, force=%s)", reportId, String(force));
  await generateReportAiSummary(reportId, { force });
  logger.info("report_ai_summary execute done (reportId=%s, durationMs=%d)", reportId, Date.now() - t0);
}
