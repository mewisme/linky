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

