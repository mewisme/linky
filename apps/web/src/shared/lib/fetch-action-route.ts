import { ApiError, parseApiErrorBody } from "@/lib/http/api-error";

export async function fetchFromActionRoute<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    const parsed = parseApiErrorBody(text || "");
    throw new ApiError(parsed.message || res.statusText, {
      status: res.status,
      userMessage: parsed.userMessage,
      rawBody: text || undefined,
    });
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
