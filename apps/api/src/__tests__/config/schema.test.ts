import { describe, expect, it } from "vitest";

import { apiEnvSchema, parseApiEnv } from "../../config/schema.js";

const validEnv = {
  NODE_ENV: "development",
  CLERK_SECRET_KEY: "sk_test",
  CLERK_WEBHOOK_SECRET: "whsec_test",
  CLOUDFLARE_TURN_API_TOKEN: "turn-token",
  CLOUDFLARE_TURN_KEY_ID: "turn-key",
  S3_BUCKET: "bucket",
  S3_REGION: "us-east-1",
  S3_ENDPOINT: "https://s3.example.com",
  S3_ACCESS_KEY_ID: "access",
  S3_SECRET_ACCESS_KEY: "secret",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  REDIS_URL: "redis://127.0.0.1:6379",
  OLLAMA_EMBEDDING_URL: "http://127.0.0.1:11434",
  OLLAMA_API_KEY: "ollama-key",
  VAPID_SUBJECT: "mailto:admin@example.com",
  VAPID_PUBLIC_KEY: "vapid-public",
  VAPID_PRIVATE_KEY: "vapid-private",
} as const;

describe("apiEnvSchema", () => {
  it("accepts a complete development configuration", () => {
    expect(() => apiEnvSchema.parse(validEnv)).not.toThrow();
  });

  it("rejects missing CLERK_SECRET_KEY", () => {
    const { CLERK_SECRET_KEY: _removed, ...incomplete } = validEnv;
    const result = apiEnvSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("CLERK_SECRET_KEY"))).toBe(true);
    }
  });

  it("rejects invalid SUPABASE_URL", () => {
    const result = apiEnvSchema.safeParse({
      ...validEnv,
      SUPABASE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("SUPABASE_URL"))).toBe(true);
    }
  });

  it("rejects unknown environment keys", () => {
    const result = apiEnvSchema.safeParse({
      ...validEnv,
      UNKNOWN_KEY: "surprise",
    });
    expect(result.success).toBe(false);
  });

  it("applies test defaults when NODE_ENV is test and secrets are unset", () => {
    const parsed = parseApiEnv({ NODE_ENV: "test" });
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.CLERK_SECRET_KEY).toBe("test-clerk-secret-key");
    expect(parsed.REDIS_URL).toBe("redis://127.0.0.1:6379");
  });
});
