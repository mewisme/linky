import type { AiJobEnvelope } from "@ws/shared-types";

import { generateReportAiSummary } from "@/domains/reports/service/report-ai-summary.service.js";
import { runUserEmbeddingRegenerationJob } from "@/domains/user/service/embedding-job.service.js";

export async function executeAiJob(envelope: AiJobEnvelope): Promise<void> {
  switch (envelope.type) {
    case "report_ai_summary": {
      await generateReportAiSummary(envelope.payload.reportId, {
        force: envelope.payload.force === true,
      });
      return;
    }
    case "user_embedding_regenerate": {
      await runUserEmbeddingRegenerationJob(envelope.payload.userId);
      return;
    }
    default: {
      const _exhaustive: never = envelope;
      void _exhaustive;
    }
  }
}
