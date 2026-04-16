import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../../../.env");
loadDotenv({ path: rootEnvPath, quiet: true });

const envSchema = z.object({
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENABLED: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.parse({
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENABLED: process.env.SENTRY_ENABLED,
  NODE_ENV: process.env.NODE_ENV,
});

export const env = {
  SENTRY_DSN: parsed.SENTRY_DSN,
  SENTRY_ENABLED: parsed.SENTRY_ENABLED === "true",
  NODE_ENV: parsed.NODE_ENV,
  isDev: parsed.NODE_ENV === "development",
  isProd: parsed.NODE_ENV === "production",
} as const;
