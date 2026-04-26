'use server'

import 'server-only';

import { getToken } from '@/lib/auth/token';
import { ApiError, parseApiErrorBody } from '@/lib/http/api-error';

export async function serverFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    const parsed = parseApiErrorBody(text || "");
    throw new ApiError(parsed.message || response.statusText, {
      status: response.status,
      userMessage: parsed.userMessage,
      rawBody: text,
    });
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
