import { createLogger } from "@/utils/logger.js";
import { generateReportAiSummary } from "@/domains/reports/service/report-ai-summary.service.js";
import { tryEnqueueAsyncJob } from "@/jobs/job-queue.js";

const logger = createLogger("jobs:report-ai-summary");

export interface ReportAiSummaryJobPayload {
  reportId: string;
  force?: boolean;
}

export function enqueueReportAiSummaryJob(payload: ReportAiSummaryJobPayload): void {
  void (async () => {
    const enqueued = await tryEnqueueAsyncJob({
      v: 1,
      type: "report_ai_summary",
      payload: {
        reportId: payload.reportId,
        force: payload.force,
      },
    });

    if (enqueued) {
      return;
    }

    setImmediate(() => {
      generateReportAiSummary(payload.reportId, { force: payload.force === true }).catch((error) => {
        logger.error(error as Error, "Report AI summary job failed for report %s", payload.reportId);
      });
    });
  })();
}
