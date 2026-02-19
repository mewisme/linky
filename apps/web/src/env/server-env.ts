if (typeof window !== "undefined") {
  throw new Error("serverEnv must not be imported in client code");
}

import { z } from "zod";

const serverEnvSchema = z
  .object({
    OPENPANEL_CLIENT_SECRET: z
      .string()
      .min(1, "OPENPANEL_CLIENT_SECRET is required"),
    NODE_ENV: z.enum(["development", "production", "test"], {
      message: "NODE_ENV must be development, production, or test",
    }),
  })
  .strict();

const raw = {
  OPENPANEL_CLIENT_SECRET: process.env.OPENPANEL_CLIENT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

const parsed = serverEnvSchema.parse(raw);

export const serverEnv = {
  OPENPANEL_CLIENT_SECRET: parsed.OPENPANEL_CLIENT_SECRET,
  NODE_ENV: parsed.NODE_ENV,
} as const;

export type ServerEnv = typeof serverEnv;
