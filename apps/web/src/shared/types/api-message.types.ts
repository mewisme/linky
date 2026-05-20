export type ApiI18nPayload = {
  key: string;
  values?: Record<string, unknown>;
};

export type ApiUserMessage = {
  code: string;
  i18n?: ApiI18nPayload;
  fallbackMessage?: string;
};
