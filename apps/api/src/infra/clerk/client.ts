import { createClerkClient, verifyToken as verifyClerkToken } from "@clerk/backend";

import { config } from "@/config/index.js";

export const clerk = createClerkClient({ secretKey: config.clerkSecretKey });

export const verifyToken = async (token: string): Promise<Awaited<ReturnType<typeof verifyClerkToken>>> => {
  return await verifyClerkToken(token, {
    secretKey: config.clerkSecretKey,
  });
}