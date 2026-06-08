'use server'

import 'server-only';

import { getToken } from '@/lib/auth/token';
import { readJsonOrThrowApiError } from '@/lib/http/api-error';
import { fetchWithApiFallback } from '@/lib/http/fetch-with-api-fallback';

export async function serverFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithApiFallback(url, { ...options, headers });
  const text = await response.text().catch(() => "");
  const replay = new Response(text, {
    status: response.status,
    statusText: response.statusText,
  });
  return readJsonOrThrowApiError<T>(replay);
}
