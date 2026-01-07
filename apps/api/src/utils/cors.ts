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

  // Handle wildcard cases
  if (trimmed === "*" || trimmed.toLowerCase() === "wildcard") {
    return "*";
  }

  // Handle array-like format: [url1, url2] or [url1,url2]
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

  // Handle comma-separated URLs
  if (trimmed.includes(",")) {
    const urls = trimmed
      .split(",")
      .map(url => url.trim())
      .filter(url => url.length > 0);
    return urls.length > 0 ? urls : "*";
  }

  // Single URL
  return trimmed;
}

