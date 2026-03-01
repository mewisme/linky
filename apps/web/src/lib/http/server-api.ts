'use server'

import { getToken } from '@/lib/auth/token';

interface ServerFetchOptions extends RequestInit {
  token?: boolean;
  preloadedToken?: string;
}

export async function serverFetch<T>(url: string, options: ServerFetchOptions = {}): Promise<T> {
  const { token: needsToken, preloadedToken, ...rest } = options;
  const token = preloadedToken ?? (needsToken ? await getToken() : undefined);

  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...rest, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(text || response.statusText);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
