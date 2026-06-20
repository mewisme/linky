import { readJsonOrThrowApiError } from "@/lib/http/api-error";

export async function fetchFromActionRoute<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  return readJsonOrThrowApiError<T>(res);
}
