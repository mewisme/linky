import { publicEnv } from "@/shared/env/public-env";

import { routing } from "./routing";

export function localePrefixedPath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return normalized;
  }
  return `/${locale}${normalized}`;
}

export function absoluteLocalePrefixedUrl(locale: string, path: string): string {
  const rel = localePrefixedPath(locale, path);
  const base = publicEnv.APP_URL.replace(/\/$/, "");
  return `${base}${rel}`;
}
