import * as Sentry from "@sentry/nextjs";

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
  fn: () => Promise<T>,
): Promise<T> {
  return withSentryAction(name, fn);
}
