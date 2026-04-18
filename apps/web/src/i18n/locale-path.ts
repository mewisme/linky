import { routing } from "./routing";

export function localePrefixedPath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return normalized;
  }
  return `/${locale}${normalized}`;
}
