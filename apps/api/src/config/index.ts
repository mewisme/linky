import 'dotenv/config';

import { parseCorsOrigin } from '../utils/cors.js';

export const config = {
  port: Number(process.env.PORT) || 7270,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  // Cloudflare TURN
  cloudflareTurnApiToken: process.env.CLOUDFLARE_TURN_API_TOKEN as string,
  cloudflareTurnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID as string,
  // Clerk
  clerkSecretKey: process.env.CLERK_SECRET_KEY as string,
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET as string,
  // S3
  s3Bucket: process.env.S3_BUCKET as string,
  s3Region: process.env.S3_REGION as string,
  s3Endpoint: process.env.S3_ENDPOINT as string,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID as string,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  // Redis
  redisUrl: process.env.REDIS_URL as string,
  redisPort: process.env.REDIS_PORT as string,
  redisUsername: process.env.REDIS_USERNAME as string,
  redisPassword: process.env.REDIS_PASSWORD as string,
  // Matchmaking
  useMemoryMatchmaking: process.env.USE_MEMORY_MATCHMAKING === "true",
  // Cache
  cacheNamespaceVersion: process.env.CACHE_NAMESPACE_VERSION || "v1",
  // Server
  shutdownTimeout: Number(process.env.SHUTDOWN_TIMEOUT) || 30000,
  jsonBodySizeLimit: process.env.JSON_BODY_SIZE_LIMIT || "500kb",
  socketMaxHttpBufferSize: Number(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE) || 8 * 1024 * 1024,
  // Timeouts
  redisTimeout: Number(process.env.REDIS_TIMEOUT) || 5000,
  supabaseTimeout: Number(process.env.SUPABASE_TIMEOUT) || 10000,
  // Rate Limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 30000,
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  // Ollama
  ollamaEmbeddingUrl: process.env.OLLAMA_EMBEDDING_URL as string,
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL as string || "bge-m3",
  ollamaCloudUrl: process.env.OLLAMA_CLOUD_URL as string || "https://ollama.com",
  ollamaCloudModel: process.env.OLLAMA_CLOUD_MODEL as string || "ministral-3:14b",
  ollamaCloudApiKey: process.env.OLLAMA_CLOUD_API_KEY as string,
  ollamaEmbeddingTimeout: Number(process.env.OLLAMA_EMBEDDING_TIMEOUT) || 60000,
  embedMaxChunkChars: Math.min(
    1800,
    Math.max(1200, Number(process.env.EMBED_MAX_CHUNK_CHARS) || 1500),
  ),
  embedChunkOverlapChars: Math.min(
    250,
    Math.max(150, Number(process.env.EMBED_CHUNK_OVERLAP_CHARS) || 200),
  ),
  embedBatchSize: Math.min(32, Math.max(1, Number(process.env.EMBED_BATCH_SIZE) || 8)),
  embedMaxChunksPerJob: Math.min(256, Math.max(4, Number(process.env.EMBED_MAX_CHUNKS_PER_JOB) || 64)),
  embedMaxTotalInputCharsPerJob: Math.max(
    8192,
    Number(process.env.EMBED_MAX_TOTAL_INPUT_CHARS_PER_JOB) || 200_000,
  ),
  embedExpectedDimension: Number(process.env.EMBED_EXPECTED_DIMENSION) || 1024,
  embedOllamaConcurrency: Math.min(16, Math.max(1, Number(process.env.EMBED_OLLAMA_CONCURRENCY) || 2)),
  embedRetryCount: Math.min(5, Math.max(0, Number(process.env.EMBED_RETRY_COUNT) || 2)),
  embedRetryBaseDelayMs: Math.max(50, Number(process.env.EMBED_RETRY_BASE_DELAY_MS) || 400),
  embedMaxBatchTotalChars: Math.max(
    4096,
    Number(process.env.EMBED_MAX_BATCH_TOTAL_CHARS) || 14_000,
  ),
  // Web Push (VAPID)
  vapidSubject: process.env.VAPID_SUBJECT as string,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY as string,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY as string,
} as const;