import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";

const logger = createLogger("infra:redis:timeout-wrapper");

export async function withRedisTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Redis operation ${operationName} timed out after ${config.redisTimeout}ms`));
    }, config.redisTimeout);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    logger.error(error as Error, "Redis operation failed: %s", operationName);
    throw error;
  }
}
