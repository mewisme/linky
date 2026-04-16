import { z } from "zod";

export const internalWorkerRuntimeEnvSchema = z.object({
  internalApiBaseUrl: z.string().url().min(1),
  internalWorkerSecret: z.string().min(1),
  internalApiTimeoutMsAi: z.number().int().positive().default(120_000),
  internalApiTimeoutMsGeneral: z.number().int().positive().default(30_000),
  internalApiMaxRetries: z.number().int().min(0).max(10).default(3),
  internalApiRetryBaseDelayMs: z.number().int().positive().default(500),
});

export type InternalWorkerRuntimeEnv = z.infer<typeof internalWorkerRuntimeEnvSchema>;

export function parseInternalWorkerRuntimeEnv(
  env: NodeJS.ProcessEnv = process.env,
): InternalWorkerRuntimeEnv {
  return internalWorkerRuntimeEnvSchema.parse({
    internalApiBaseUrl: env.INTERNAL_API_BASE_URL,
    internalWorkerSecret: env.INTERNAL_WORKER_SECRET,
    internalApiTimeoutMsAi: env.INTERNAL_API_TIMEOUT_MS_AI
      ? Number(env.INTERNAL_API_TIMEOUT_MS_AI)
      : undefined,
    internalApiTimeoutMsGeneral: env.INTERNAL_API_TIMEOUT_MS_GENERAL
      ? Number(env.INTERNAL_API_TIMEOUT_MS_GENERAL)
      : undefined,
    internalApiMaxRetries: env.INTERNAL_API_MAX_RETRIES ? Number(env.INTERNAL_API_MAX_RETRIES) : undefined,
    internalApiRetryBaseDelayMs: env.INTERNAL_API_RETRY_BASE_DELAY_MS
      ? Number(env.INTERNAL_API_RETRY_BASE_DELAY_MS)
      : undefined,
  });
}
