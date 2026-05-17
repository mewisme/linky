import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "production", "test"]).default("development");

const requiredSecret = z.string().min(1);

const videoProviderSchema = z.enum(["p2p", "cloudflare_sfu"]).default("p2p");

const TEST_ENV_DEFAULTS: Record<string, string> = {
  CLERK_SECRET_KEY: "test-clerk-secret-key",
  CLERK_WEBHOOK_SECRET: "test-clerk-webhook-secret",
  CLOUDFLARE_TURN_API_TOKEN: "test-cloudflare-turn-token",
  CLOUDFLARE_TURN_KEY_ID: "test-cloudflare-turn-key-id",
  CLOUDFLARE_REALTIME_APP_ID: "test-cloudflare-realtime-app-id",
  CLOUDFLARE_REALTIME_APP_SECRET: "test-cloudflare-realtime-app-secret",
  S3_BUCKET: "test-bucket",
  S3_REGION: "us-east-1",
  S3_ENDPOINT: "https://s3.example.com",
  S3_ACCESS_KEY_ID: "test-s3-access-key",
  S3_SECRET_ACCESS_KEY: "test-s3-secret-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-supabase-service-role-key",
  REDIS_URL: "redis://127.0.0.1:6379",
  OLLAMA_EMBEDDING_URL: "http://127.0.0.1:11434",
  OLLAMA_API_KEY: "test-ollama-api-key",
  VAPID_SUBJECT: "mailto:test@example.com",
  VAPID_PUBLIC_KEY: "test-vapid-public-key",
  VAPID_PRIVATE_KEY: "test-vapid-private-key",
};

export const apiEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().int().positive().max(65535).optional(),
    CORS_ORIGIN: z.string().optional(),
    CLOUDFLARE_TURN_API_TOKEN: requiredSecret,
    CLOUDFLARE_TURN_KEY_ID: requiredSecret,
    VIDEO_PROVIDER: videoProviderSchema,
    CLOUDFLARE_REALTIME_APP_ID: z.string().optional(),
    CLOUDFLARE_REALTIME_APP_SECRET: z.string().optional(),
    CLOUDFLARE_REALTIME_BASE_URL: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLERK_SECRET_KEY: requiredSecret,
    CLERK_WEBHOOK_SECRET: requiredSecret,
    S3_BUCKET: requiredSecret,
    S3_REGION: requiredSecret,
    S3_ENDPOINT: requiredSecret,
    S3_ACCESS_KEY_ID: requiredSecret,
    S3_SECRET_ACCESS_KEY: requiredSecret,
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: requiredSecret,
    INTERNAL_API_SOCKET_PATH: z.string().optional(),
    INTERNAL_API_PORT: z.coerce.number().int().positive().max(65535).optional(),
    REDIS_URL: requiredSecret,
    REDIS_PORT: z.string().optional(),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    USE_MEMORY_MATCHMAKING: z.string().optional(),
    CACHE_NAMESPACE_VERSION: z.string().optional(),
    SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().optional(),
    JSON_BODY_SIZE_LIMIT: z.string().optional(),
    SOCKET_MAX_HTTP_BUFFER_SIZE: z.coerce.number().int().positive().optional(),
    REDIS_TIMEOUT: z.coerce.number().int().positive().optional(),
    SUPABASE_TIMEOUT: z.coerce.number().int().positive().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().optional(),
    OLLAMA_EMBEDDING_URL: requiredSecret,
    OLLAMA_EMBEDDING_MODEL: z.string().optional(),
    OLLAMA_CLOUD_MODEL: z.string().optional(),
    OLLAMA_API_KEY: requiredSecret,
    OLLAMA_EMBEDDING_TIMEOUT: z.coerce.number().int().positive().optional(),
    EMBED_MAX_CHUNK_CHARS: z.coerce.number().int().positive().optional(),
    EMBED_CHUNK_OVERLAP_CHARS: z.coerce.number().int().positive().optional(),
    EMBED_BATCH_SIZE: z.coerce.number().int().positive().optional(),
    EMBED_MAX_CHUNKS_PER_JOB: z.coerce.number().int().positive().optional(),
    EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB: z.coerce.number().int().positive().optional(),
    EMBED_EXPECTED_DIMENSION: z.coerce.number().int().positive().optional(),
    EMBED_OLLAMA_CONCURRENCY: z.coerce.number().int().positive().optional(),
    EMBED_RETRY_COUNT: z.coerce.number().int().nonnegative().optional(),
    EMBED_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().optional(),
    EMBED_MAX_BATCH_TOTAL_CHARS: z.coerce.number().int().positive().optional(),
    VAPID_SUBJECT: requiredSecret,
    VAPID_PUBLIC_KEY: requiredSecret,
    VAPID_PRIVATE_KEY: requiredSecret,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.VIDEO_PROVIDER === "cloudflare_sfu") {
      if (!data.CLOUDFLARE_REALTIME_APP_ID || data.CLOUDFLARE_REALTIME_APP_ID.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDFLARE_REALTIME_APP_ID"],
          message: "CLOUDFLARE_REALTIME_APP_ID is required when VIDEO_PROVIDER=cloudflare_sfu",
        });
      }
      if (!data.CLOUDFLARE_REALTIME_APP_SECRET || data.CLOUDFLARE_REALTIME_APP_SECRET.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDFLARE_REALTIME_APP_SECRET"],
          message: "CLOUDFLARE_REALTIME_APP_SECRET is required when VIDEO_PROVIDER=cloudflare_sfu",
        });
      }
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

function pickApiEnv(source: NodeJS.ProcessEnv): Record<string, unknown> {
  return {
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    CORS_ORIGIN: source.CORS_ORIGIN,
    CLOUDFLARE_TURN_API_TOKEN: source.CLOUDFLARE_TURN_API_TOKEN,
    CLOUDFLARE_TURN_KEY_ID: source.CLOUDFLARE_TURN_KEY_ID,
    VIDEO_PROVIDER: source.VIDEO_PROVIDER,
    CLOUDFLARE_REALTIME_APP_ID: source.CLOUDFLARE_REALTIME_APP_ID,
    CLOUDFLARE_REALTIME_APP_SECRET: source.CLOUDFLARE_REALTIME_APP_SECRET,
    CLOUDFLARE_REALTIME_BASE_URL: source.CLOUDFLARE_REALTIME_BASE_URL,
    CLOUDFLARE_ACCOUNT_ID: source.CLOUDFLARE_ACCOUNT_ID,
    CLERK_SECRET_KEY: source.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: source.CLERK_WEBHOOK_SECRET,
    S3_BUCKET: source.S3_BUCKET,
    S3_REGION: source.S3_REGION,
    S3_ENDPOINT: source.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY,
    SUPABASE_URL: source.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    INTERNAL_API_SOCKET_PATH: source.INTERNAL_API_SOCKET_PATH,
    INTERNAL_API_PORT: source.INTERNAL_API_PORT,
    REDIS_URL: source.REDIS_URL,
    REDIS_PORT: source.REDIS_PORT,
    REDIS_USERNAME: source.REDIS_USERNAME,
    REDIS_PASSWORD: source.REDIS_PASSWORD,
    USE_MEMORY_MATCHMAKING: source.USE_MEMORY_MATCHMAKING,
    CACHE_NAMESPACE_VERSION: source.CACHE_NAMESPACE_VERSION,
    SHUTDOWN_TIMEOUT: source.SHUTDOWN_TIMEOUT,
    JSON_BODY_SIZE_LIMIT: source.JSON_BODY_SIZE_LIMIT,
    SOCKET_MAX_HTTP_BUFFER_SIZE: source.SOCKET_MAX_HTTP_BUFFER_SIZE,
    REDIS_TIMEOUT: source.REDIS_TIMEOUT,
    SUPABASE_TIMEOUT: source.SUPABASE_TIMEOUT,
    RATE_LIMIT_WINDOW_MS: source.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: source.RATE_LIMIT_MAX_REQUESTS,
    OLLAMA_EMBEDDING_URL: source.OLLAMA_EMBEDDING_URL,
    OLLAMA_EMBEDDING_MODEL: source.OLLAMA_EMBEDDING_MODEL,
    OLLAMA_CLOUD_MODEL: source.OLLAMA_CLOUD_MODEL,
    OLLAMA_API_KEY: source.OLLAMA_API_KEY,
    OLLAMA_EMBEDDING_TIMEOUT: source.OLLAMA_EMBEDDING_TIMEOUT,
    EMBED_MAX_CHUNK_CHARS: source.EMBED_MAX_CHUNK_CHARS,
    EMBED_CHUNK_OVERLAP_CHARS: source.EMBED_CHUNK_OVERLAP_CHARS,
    EMBED_BATCH_SIZE: source.EMBED_BATCH_SIZE,
    EMBED_MAX_CHUNKS_PER_JOB: source.EMBED_MAX_CHUNKS_PER_JOB,
    EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB: source.EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB,
    EMBED_EXPECTED_DIMENSION: source.EMBED_EXPECTED_DIMENSION,
    EMBED_OLLAMA_CONCURRENCY: source.EMBED_OLLAMA_CONCURRENCY,
    EMBED_RETRY_COUNT: source.EMBED_RETRY_COUNT,
    EMBED_RETRY_BASE_DELAY_MS: source.EMBED_RETRY_BASE_DELAY_MS,
    EMBED_MAX_BATCH_TOTAL_CHARS: source.EMBED_MAX_BATCH_TOTAL_CHARS,
    VAPID_SUBJECT: source.VAPID_SUBJECT,
    VAPID_PUBLIC_KEY: source.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: source.VAPID_PRIVATE_KEY,
  };
}

function definedEnvEntries(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function prepareEnv(source: NodeJS.ProcessEnv): Record<string, unknown> {
  const picked = definedEnvEntries(pickApiEnv(source));
  const nodeEnv =
    typeof picked.NODE_ENV === "string" ? picked.NODE_ENV : source.NODE_ENV ?? "development";
  if (nodeEnv !== "test") {
    return picked;
  }
  return { ...TEST_ENV_DEFAULTS, ...picked, NODE_ENV: "test" };
}

function reportEnvError(message: string, err: z.ZodError): never {
  console.error(message);
  for (const issue of err.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    console.error(`  ${path}: ${issue.message}`);
  }
  process.exit(1);
}

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  try {
    return apiEnvSchema.parse(prepareEnv(source));
  } catch (err) {
    if (err instanceof z.ZodError) {
      reportEnvError("Invalid API environment configuration:", err);
    }
    throw err;
  }
}
