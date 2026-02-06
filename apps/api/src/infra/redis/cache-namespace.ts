import { config } from "@/config/index.js";

export function shouldVersionKey(key: string): boolean {
  const legacyKeys = [
    "match:",
    "user:favorites:",
    "user:reports:",
    "admin:",
    "ref:",
  ];

  return !legacyKeys.some((prefix) => key.startsWith(prefix));
}

export function getCacheKey(key: string): string {
  if (!config.cacheNamespaceVersion || config.cacheNamespaceVersion === "v1") {
    return key;
  }

  if (!shouldVersionKey(key)) {
    return key;
  }

  return `${config.cacheNamespaceVersion}:${key}`;
}
