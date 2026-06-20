import type { ApiUserMessage } from "@/shared/types/api-message.types";

export type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
) => string;

function hasI18nValues(
  values: Record<string, unknown> | undefined,
): values is Record<string, unknown> {
  return (
    !!values && typeof values === "object" && Object.keys(values).length > 0
  );
}

export function resolveBackendMessage(
  message: ApiUserMessage | undefined,
  t: TranslateFn,
  genericKey = "errors.unexpected",
): string {
  if (!message) {
    return t(genericKey);
  }

  if (message.i18n?.key) {
    const values = message.i18n.values;
    if (hasI18nValues(values)) {
      return t(message.i18n.key, values);
    }
    if (message.fallbackMessage) {
      return message.fallbackMessage;
    }
    return t(message.i18n.key);
  }

  if (message.fallbackMessage) {
    return message.fallbackMessage;
  }

  return t(genericKey);
}
