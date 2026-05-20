export type AppLocale = "en" | "vi";

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "vi";
}
