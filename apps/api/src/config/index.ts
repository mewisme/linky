import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
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
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY as string,
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
} as const;

