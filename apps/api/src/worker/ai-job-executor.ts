import type { AiJobEnvelope } from "@ws/shared-types";

import { generateReportAiSummary } from "@/domains/reports/service/report-ai-summary.service.js";
import { runUserEmbeddingRegenerationJob } from "@/domains/user/service/embedding-job.service.js";
import { connectRedis, redisClient } from "@/infra/redis/client.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("api:worker:ai-job");

let redisConnectPromise: Promise<void> | null = null;

async function ensureWorkerRedisConnected(): Promise<void> {
  if (redisClient.isOpen) return;
  if (!redisConnectPromise) {
    redisConnectPromise = connectRedis().finally(() => {
      redisConnectPromise = null;
    });
  }
  await redisConnectPromise;
}

export async function executeAiJob(envelope: AiJobEnvelope): Promise<void> {
  await ensureWorkerRedisConnected();

  switch (envelope.type) {
    case "report_ai_summary": {
      const reportId = envelope.payload.reportId;
      const force = envelope.payload.force === true;
      const t0 = Date.now();
      logger.info("report_ai_summary execute start (reportId=%s, force=%s)", reportId, String(force));
      await generateReportAiSummary(reportId, { force });
      logger.info("report_ai_summary execute done (reportId=%s, durationMs=%d)", reportId, Date.now() - t0);
      return;
    }
    case "user_embedding_regenerate": {
      const userId = envelope.payload.userId;
      const t0 = Date.now();
      logger.info("user_embedding_regenerate execute start (userId=%s)", userId);
      await runUserEmbeddingRegenerationJob(userId);
      logger.info("user_embedding_regenerate execute done (userId=%s, durationMs=%d)", userId, Date.now() - t0);
      return;
    }
    default: {
      const _exhaustive: never = envelope;
      void _exhaustive;
    }
  }
}
