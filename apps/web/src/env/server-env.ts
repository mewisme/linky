if (typeof window !== "undefined") {
  throw new Error("serverEnv must not be imported in client code");
}

import { z } from "zod";

const serverEnvSchema = z
  .object({
    OPENPANEL_API_URL: z
      .string()
      .min(1, "OPENPANEL_API_URL is required"),
    OPENPANEL_CLIENT_SECRET: z
      .string()
      .min(1, "OPENPANEL_CLIENT_SECRET is required"),
    NODE_ENV: z.enum(["development", "production", "test"], {
      message: "NODE_ENV must be development, production, or test",
    }),
  })
  .strict();

const raw = {
  OPENPANEL_API_URL: process.env.OPENPANEL_API_URL,
  OPENPANEL_CLIENT_SECRET: process.env.OPENPANEL_CLIENT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

const parsed = serverEnvSchema.parse(raw);

export const serverEnv = {
  OPENPANEL_API_URL: parsed.OPENPANEL_API_URL,
  OPENPANEL_CLIENT_SECRET: parsed.OPENPANEL_CLIENT_SECRET,
  NODE_ENV: parsed.NODE_ENV,
  isDev: parsed.NODE_ENV === "development",
  isProd: parsed.NODE_ENV === "production",
  isTest: parsed.NODE_ENV === "test",
} as const;

export type ServerEnv = typeof serverEnv;
