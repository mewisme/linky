'use server'

import * as Sentry from '@sentry/nextjs';

import { getToken } from '@/lib/auth/token';

interface ServerFetchOptions extends RequestInit {
  preloadedToken?: string;
}

export async function serverFetch<T>(url: string, options: ServerFetchOptions = {}): Promise<T> {
  const { preloadedToken, ...rest } = options;
  const token = preloadedToken ?? await getToken();

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  Sentry.logger.info(`Fetching ${url} with token: ${token?.substring(0, 10)}...`);
  console.log(`Fetching ${url} with token: ${token?.substring(0, 10)}...`);

  const response = await fetch(url, { ...rest, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    Sentry.logger.error(`Failed to fetch ${url}`, { error: text || response.statusText });
    console.error(`Failed to fetch ${url}`, { error: text || response.statusText });
    Sentry.captureException(new Error(text || response.statusText));
    throw new Error(text || response.statusText);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
