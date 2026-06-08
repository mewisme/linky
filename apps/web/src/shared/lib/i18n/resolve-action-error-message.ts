import { isApiError } from "@/lib/http/api-error";
import type { ApiUserMessage } from "@/shared/types/api-message.types";

import { resolveBackendMessage, type TranslateFn } from "./resolve-backend-message";

function hasResolvableUserMessage(message: ApiUserMessage | undefined): message is ApiUserMessage {
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

export function resolveActionErrorMessage(
  error: unknown,
  t: unknown,
  fallbackKey: string,
): string {
  const translate = t as TranslateFn;
  if (isApiError(error)) {
    if (hasResolvableUserMessage(error.userMessage)) {
      return resolveBackendMessage(error.userMessage, translate, fallbackKey);
    }
    if (error.message) {
      return error.message;
    }
    return translate(fallbackKey);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return translate(fallbackKey);
}
