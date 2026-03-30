import { z } from "zod";

export const runtimeConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  redisUrl: z.string().optional(),
  redisPort: z.string().optional(),
  redisUsername: z.string().optional(),
  redisPassword: z.string().optional(),
  redisTimeoutMs: z.number().int().positive().default(5000),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function getRuntimeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return runtimeConfigSchema.parse({
    nodeEnv: env.NODE_ENV,
    redisUrl: env.REDIS_URL,
    redisPort: env.REDIS_PORT,
    redisUsername: env.REDIS_USERNAME,
    redisPassword: env.REDIS_PASSWORD,
    redisTimeoutMs: Number(env.REDIS_TIMEOUT ?? 5000),
  });
}
