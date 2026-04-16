import { runUserEmbeddingRegenerationJob } from "@/domains/user/service/embedding-job.service.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("api:worker:ai:user-embedding-regenerate");

export async function executeUserEmbeddingRegenerateJob(userId: string): Promise<void> {
  const t0 = Date.now();
  logger.info("user_embedding_regenerate execute start (userId=%s)", userId);
  await runUserEmbeddingRegenerationJob(userId);
  logger.info("user_embedding_regenerate execute done (userId=%s, durationMs=%d)", userId, Date.now() - t0);
}
