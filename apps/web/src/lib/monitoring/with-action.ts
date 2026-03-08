import * as Sentry from "@sentry/nextjs";

import { getToken } from "../auth/token";
import { headers } from "next/headers";

export async function withSentryAction<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.withServerActionInstrumentation(
    name,
    { headers: await headers(), recordResponse: true },
    fn,
  ) as Promise<T>;
}

export async function withSentryQuery<T>(
  name: string,
  fn: (token: string | undefined) => Promise<T>,
): Promise<T> {
  let preloadedToken: string | undefined;
  try {
    preloadedToken = await getToken();
  } catch (error) {
    Sentry.metrics.count("with_sentry_query_auth_error", 1);
    Sentry.logger.error("Failed to get auth token", { error: error instanceof Error ? error.message : "Unknown error" });
  }

  return withSentryAction(name, () => fn(preloadedToken));
}
