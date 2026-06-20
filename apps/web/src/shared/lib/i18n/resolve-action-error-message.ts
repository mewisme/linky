import { coerceApiError } from "@/lib/http/api-error";
import type { ApiUserMessage } from "@/shared/types/api-message.types";

import {
  resolveBackendMessage,
  type TranslateFn,
} from "./resolve-backend-message";

function readableApiErrorText(error: unknown, fallback: string): string | null {
  const apiError = coerceApiError(error);
  if (!apiError) {
    return null;
  }
  if (apiError.userMessage?.fallbackMessage) {
    return apiError.userMessage.fallbackMessage;
  }
  if (apiError.message && !apiError.message.trim().startsWith("{")) {
    return apiError.message;
  }
  return fallback;
}

function hasResolvableUserMessage(
  message: ApiUserMessage | undefined,
): message is ApiUserMessage {
  return !!message?.i18n?.key || !!message?.fallbackMessage;
}

export type ApiResponseWithUserMessage = {
  message?: string;
  userMessage?: ApiUserMessage;
};

export function resolveApiUserMessage(
  userMessage: ApiUserMessage | undefined,
  t: unknown,
  fallbackKey: string,
): string {
  return resolveBackendMessage(userMessage, t as TranslateFn, fallbackKey);
}

export function resolveActionSuccessMessage(
  body: ApiResponseWithUserMessage | undefined,
  t: unknown,
  fallbackKey: string,
): string {
  if (body?.userMessage) {
    return resolveApiUserMessage(body.userMessage, t, fallbackKey);
  }
  if (typeof body?.message === "string" && body.message) {
    return body.message;
  }
  return (t as TranslateFn)(fallbackKey);
}

export function resolveApiErrorDisplay(
  error: unknown,
  fallback: string,
): string {
  const fromApi = readableApiErrorText(error, fallback);
  if (fromApi) {
    return fromApi;
  }
  if (
    error instanceof Error &&
    error.message &&
    !error.message.trim().startsWith("{")
  ) {
    return error.message;
  }
  return fallback;
}

export function resolveActionErrorMessage(
  error: unknown,
  t: unknown,
  fallbackKey: string,
): string {
  const translate = t as TranslateFn;
  const fallback = translate(fallbackKey);
  const apiError = coerceApiError(error);

  if (apiError?.userMessage && hasResolvableUserMessage(apiError.userMessage)) {
    return resolveBackendMessage(apiError.userMessage, translate, fallbackKey);
  }

  return resolveApiErrorDisplay(error, fallback);
}
