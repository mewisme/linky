import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";

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
    logger.error(error as Error, "Supabase operation failed: %s", operationName);
    throw error;
  }
}
