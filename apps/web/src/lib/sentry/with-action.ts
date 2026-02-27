import * as Sentry from "@sentry/nextjs";
import { unstable_cache } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { headers } from "next/headers";

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
  } catch {
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
