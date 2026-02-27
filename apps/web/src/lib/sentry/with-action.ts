import * as Sentry from "@sentry/nextjs";

import { auth } from '@clerk/nextjs/server';
import { headers } from "next/headers";
import { unstable_cache } from 'next/cache';

interface QueryCacheOptions {
  keyParts: string[];
  tags: string[];
  revalidate?: number;
}

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
  cache: QueryCacheOptions,
): Promise<T> {
  let preloadedToken: string | undefined;
  let userId: string | undefined;
  try {
    const { getToken: clerkGetToken, userId: clerkUserId } = await auth();
    preloadedToken = (await clerkGetToken({ template: 'custom' })) ?? undefined;
    userId = clerkUserId ?? undefined;
  } catch (error) {
    Sentry.metrics.count("with_sentry_query_auth_error", 1);
    Sentry.logger.error("Failed to get auth token", { error: error instanceof Error ? error.message : "Unknown error" });
    // Public / unauthenticated routes
  }

  const keyParts = userId ? [userId, ...cache.keyParts] : cache.keyParts;

  const cached = unstable_cache(
    async () => fn(preloadedToken),
    keyParts,
    {
      tags: cache.tags,
      ...(cache.revalidate !== undefined ? { revalidate: cache.revalidate } : {}),
    },
  ) as () => Promise<T>;

  return withSentryAction(name, cached);
}
