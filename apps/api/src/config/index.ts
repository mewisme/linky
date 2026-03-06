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
  // MQTT
  mqttUrl: process.env.MQTT_CLIENT_URL as string,
  mqttPort: process.env.MQTT_CLIENT_PORT as string,
  mqttWsPort: process.env.MQTT_CLIENT_WS_PORT as string,
  mqttUsername: process.env.MQTT_CLIENT_USERNAME as string,
  mqttPassword: process.env.MQTT_CLIENT_PASSWORD as string,
  // Redis
  redisUrl: process.env.REDIS_URL as string,
  redisPort: process.env.REDIS_PORT as string,
  redisUsername: process.env.REDIS_USERNAME as string,
  redisPassword: process.env.REDIS_PASSWORD as string,
  // Matchmaking
  useRedisMatchmaking: process.env.USE_REDIS_MATCHMAKING === "true",
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
  ollamaUrl: process.env.OLLAMA_URL as string,
  ollamaEmbeddingTimeout: Number(process.env.OLLAMA_EMBEDDING_TIMEOUT) || 60000,
  // Web Push (VAPID)
  vapidSubject: process.env.VAPID_SUBJECT as string,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY as string,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY as string,
} as const;