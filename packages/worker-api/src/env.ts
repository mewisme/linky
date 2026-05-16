import { z } from "zod";

export const internalWorkerRuntimeEnvSchema = z
  .object({
    internalApiBaseUrl: z.string().url().optional(),
    internalApiSocketPath: z.string().min(1).optional(),
    internalApiTimeoutMs: z.number().int().positive().default(120_000),
    internalApiMaxRetries: z.number().int().min(0).max(10).default(3),
    internalApiRetryBaseDelayMs: z.number().int().positive().default(500),
  })
  .refine(
    (env) => Boolean(env.internalApiSocketPath) || Boolean(env.internalApiBaseUrl),
    {
      message: "INTERNAL_API_SOCKET_PATH or INTERNAL_API_BASE_URL must be set",
      path: ["internalApiBaseUrl"],
    },
  );

export type InternalWorkerRuntimeEnv = z.infer<typeof internalWorkerRuntimeEnvSchema>;

export function parseInternalWorkerRuntimeEnv(
  env: NodeJS.ProcessEnv = process.env,
): InternalWorkerRuntimeEnv {
  return internalWorkerRuntimeEnvSchema.parse({
    internalApiBaseUrl: env.INTERNAL_API_BASE_URL || undefined,
    internalApiSocketPath: env.INTERNAL_API_SOCKET_PATH || undefined,
    internalApiTimeoutMs: env.INTERNAL_API_TIMEOUT_MS
      ? Number(env.INTERNAL_API_TIMEOUT_MS)
      : undefined,
    internalApiMaxRetries: env.INTERNAL_API_MAX_RETRIES ? Number(env.INTERNAL_API_MAX_RETRIES) : undefined,
    internalApiRetryBaseDelayMs: env.INTERNAL_API_RETRY_BASE_DELAY_MS
      ? Number(env.INTERNAL_API_RETRY_BASE_DELAY_MS)
      : undefined,
  });
}
