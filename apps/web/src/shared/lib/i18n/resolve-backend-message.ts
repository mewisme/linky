import type { BackendUserMessage } from "@ws/shared-types";

type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

export function resolveBackendMessage(
  message: BackendUserMessage | undefined,
  t: TranslateFn,
  genericKey = "errors.unexpected",
): string {
  if (message?.i18n?.key) {
    const values = message.i18n.values;
    if (values && typeof values === "object") {
      return t(message.i18n.key, values as Record<string, unknown>);
    }
    return t(message.i18n.key);
  }
  if (message?.fallbackMessage) {
    return message.fallbackMessage;
  }
  return t(genericKey);
}
