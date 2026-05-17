/**
 * Parse CORS origin from environment variable
 * Supports multiple formats:
 * - "*" or "wildcard" -> returns "*" (allow all origins)
 * - "url" -> returns single URL string
 * - "url1,url2" -> returns array of URLs
 * - "[url1, url2]" -> returns array of URLs (array-like format)
 *
 * @param envValue - The CORS_ORIGIN environment variable value
 * @returns Parsed CORS origin value (string, array, or "*")
 */
export function parseCorsOrigin(envValue: string | undefined): string | string[] {
  if (!envValue) {
    return "*";
  }

  const trimmed = envValue.trim();

  if (trimmed === "*" || trimmed.toLowerCase() === "wildcard") {
    return "*";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const content = trimmed.slice(1, -1).trim();
    if (!content) {
      return "*";
    }
    const urls = content
      .split(",")
      .map(url => url.trim())
      .filter(url => url.length > 0);
    return urls.length > 0 ? urls : "*";
  }

  if (trimmed.includes(",")) {
    const urls = trimmed
      .split(",")
      .map(url => url.trim())
      .filter(url => url.length > 0);
    return urls.length > 0 ? urls : "*";
  }

  return trimmed;
}

/**
 * Production-safe wrapper around `parseCorsOrigin`.
 *
 * In production, refuse to start if `CORS_ORIGIN` is unset, an empty
 * allowlist, or the wildcard `*`. The same parsed value is used for both
 * Express CORS and Socket.IO CORS, so this is the single enforcement point.
 *
 * Throws an `Error` (caller is expected to fail fast at boot).
 */
export function parseCorsOriginStrict(
  envValue: string | undefined,
  nodeEnv: string,
): string | string[] {
  const origin = parseCorsOrigin(envValue);

  if (nodeEnv !== "production") {
    return origin;
  }

  const isWildcard = origin === "*";
  const isEmptyArray = Array.isArray(origin) && origin.length === 0;

  if (isWildcard || isEmptyArray) {
    throw new Error(
      "CORS_ORIGIN must be set to an explicit allowlist in production (wildcard '*' is not allowed)",
    );
  }

  return origin;
}

