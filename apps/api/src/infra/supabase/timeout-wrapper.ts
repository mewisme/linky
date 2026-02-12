import { config } from "@/config/index.js";
import { createLogger } from "@ws/logger";

const logger = createLogger("infra:supabase:timeout-wrapper");

export async function withSupabaseTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Supabase operation ${operationName} timed out after ${config.supabaseTimeout}ms`));
    }, config.supabaseTimeout);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    logger.error("Supabase operation failed: %s %o", operationName, error as Error);
    throw error;
  }
}
