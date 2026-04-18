import type { BackendI18nPayload, BackendUserMessage } from "@ws/shared-types";

export function toUserMessage(
  code: string,
  i18n: BackendI18nPayload,
  fallbackMessage?: string,
): BackendUserMessage {
  return {
    code,
    i18n,
    ...(fallbackMessage !== undefined ? { fallbackMessage } : {}),
  };
}

export function toUserMessageFallbackOnly(code: string, fallbackMessage: string): BackendUserMessage {
  return { code, fallbackMessage };
}

export function userFacingPayload(userMessage: BackendUserMessage): {
  message: string;
  userMessage: BackendUserMessage;
} {
  return {
    message: userMessage.fallbackMessage ?? "",
    userMessage,
  };
}
