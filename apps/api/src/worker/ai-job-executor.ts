import type { AiJobEnvelope } from "@ws/shared-types";

import { executeReportAiSummaryJob } from "@/worker/worker-ai/report-ai-summary.js";
import { executeUserEmbeddingRegenerateJob } from "@/worker/worker-ai/user-embedding-regenerate.js";
import { connectRedis, redisClient } from "@/infra/redis/client.js";

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
      const force = envelope.payload.force === true;
      await executeReportAiSummaryJob(envelope.payload.reportId, force);
      return;
    }
    case "user_embedding_regenerate": {
      await executeUserEmbeddingRegenerateJob(envelope.payload.userId);
      return;
    }
    default: {
      const _exhaustive: never = envelope;
      void _exhaustive;
    }
  }
}
