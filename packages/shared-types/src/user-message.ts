export type BackendI18nPayload = {
  key: string;
  values?: Record<string, unknown>;
};

export type BackendUserMessage = {
  code: string;
  i18n?: BackendI18nPayload;
  fallbackMessage?: string;
};

export type UiLocale = "en" | "vi";

export function isUiLocale(value: unknown): value is UiLocale {
  return value === "en" || value === "vi";
}
