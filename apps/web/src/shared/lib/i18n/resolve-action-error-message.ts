import { ApiError } from "@/lib/http/api-error";

import { resolveBackendMessage, type TranslateFn } from "./resolve-backend-message";

export function resolveActionErrorMessage(
  error: unknown,
  t: unknown,
  fallbackKey: string,
): string {
  const translate = t as TranslateFn;
  if (error instanceof ApiError) {
    return resolveBackendMessage(error.userMessage, translate, fallbackKey);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return translate(fallbackKey);
}
