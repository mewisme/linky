import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCorsOriginStrict } from "../utils/cors.js";
import { args } from "./args.js";
import { parseApiEnv } from "./schema.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../../../.env");
loadDotenv({ path: rootEnvPath, quiet: true });

const env = parseApiEnv(process.env);

let corsOrigin: string | string[];
try {
  corsOrigin = parseCorsOriginStrict(env.CORS_ORIGIN, env.NODE_ENV);
} catch (err) {
  const message = err instanceof Error ? err.message : "Invalid CORS_ORIGIN";
  console.error(message);
  process.exit(1);
}

export const config = {
  port: args.port ?? env.PORT ?? 7270,
  nodeEnv: env.NODE_ENV,
  corsOrigin,
  cloudflareTurnApiToken: env.CLOUDFLARE_TURN_API_TOKEN,
  cloudflareTurnKeyId: env.CLOUDFLARE_TURN_KEY_ID,
  clerkSecretKey: env.CLERK_SECRET_KEY,
  clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
  s3Bucket: env.S3_BUCKET,
  s3Region: env.S3_REGION,
  s3Endpoint: env.S3_ENDPOINT,
  s3AccessKeyId: env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: env.S3_SECRET_ACCESS_KEY,
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  internalApiSocketPath: env.INTERNAL_API_SOCKET_PATH ?? "",
  internalApiPort: env.INTERNAL_API_PORT ?? 7271,
  redisUrl: env.REDIS_URL,
  redisPort: env.REDIS_PORT ?? "",
  redisUsername: env.REDIS_USERNAME ?? "",
  redisPassword: env.REDIS_PASSWORD ?? "",
  useMemoryMatchmaking: env.USE_MEMORY_MATCHMAKING === "true",
  cacheNamespaceVersion: env.CACHE_NAMESPACE_VERSION || "v1",
  shutdownTimeout: env.SHUTDOWN_TIMEOUT ?? 30000,
  jsonBodySizeLimit: env.JSON_BODY_SIZE_LIMIT || "500kb",
  socketMaxHttpBufferSize: env.SOCKET_MAX_HTTP_BUFFER_SIZE ?? 8 * 1024 * 1024,
  redisTimeout: env.REDIS_TIMEOUT ?? 5000,
  supabaseTimeout: env.SUPABASE_TIMEOUT ?? 10000,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS ?? 30000,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS ?? 100,
  ollamaEmbeddingUrl: env.OLLAMA_EMBEDDING_URL,
  ollamaEmbeddingModel: env.OLLAMA_EMBEDDING_MODEL || "bge-m3",
  ollamaCloudModel: env.OLLAMA_CLOUD_MODEL || "ministral-3:14b",
  ollamaApiKey: env.OLLAMA_API_KEY,
  ollamaEmbeddingTimeout: env.OLLAMA_EMBEDDING_TIMEOUT ?? 60000,
  embedMaxChunkChars: Math.min(
    1800,
    Math.max(1200, env.EMBED_MAX_CHUNK_CHARS ?? 1500),
  ),
  embedChunkOverlapChars: Math.min(
    250,
    Math.max(150, env.EMBED_CHUNK_OVERLAP_CHARS ?? 200),
  ),
  embedBatchSize: Math.min(32, Math.max(1, env.EMBED_BATCH_SIZE ?? 8)),
  embedMaxChunksPerJob: Math.min(256, Math.max(4, env.EMBED_MAX_CHUNKS_PER_JOB ?? 64)),
  embedMaxTotalInputCharsPerJob: Math.max(
    8192,
    env.EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB ?? 200_000,
  ),
  embedExpectedDimension: env.EMBED_EXPECTED_DIMENSION ?? 1024,
  embedOllamaConcurrency: Math.min(16, Math.max(1, env.EMBED_OLLAMA_CONCURRENCY ?? 2)),
  embedRetryCount: Math.min(5, Math.max(0, env.EMBED_RETRY_COUNT ?? 2)),
  embedRetryBaseDelayMs: Math.max(50, env.EMBED_RETRY_BASE_DELAY_MS ?? 400),
  embedMaxBatchTotalChars: Math.max(
    4096,
    env.EMBED_MAX_BATCH_TOTAL_CHARS ?? 14_000,
  ),
  vapidSubject: env.VAPID_SUBJECT,
  vapidPublicKey: env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: env.VAPID_PRIVATE_KEY,
} as const;
