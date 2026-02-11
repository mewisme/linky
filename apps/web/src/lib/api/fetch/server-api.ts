'use server'

import { getToken } from '@/lib/auth/token';

interface FetchOptions extends RequestInit {
  token?: boolean;
}

export async function fetchData<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const token = options.token ? await getToken() : undefined;
  options.headers = { ...options.headers, Authorization: token ? `Bearer ${token}` : '' };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}