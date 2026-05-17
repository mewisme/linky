import type { NextConfig } from "next";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

const REMOTE_IMAGE_EXACT_HOSTS = ["img.clerk.com", "images.clerk.dev"] as const;

const REMOTE_IMAGE_SUFFIX_HOSTS = [
  "amazonaws.com",
  "cloudfront.net",
  "supabase.co",
  "giphy.com",
] as const;

function hostnameMatchesAllowlist(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (REMOTE_IMAGE_EXACT_HOSTS.some((allowed) => host === allowed)) {
    return true;
  }
  return REMOTE_IMAGE_SUFFIX_HOSTS.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export const remoteImagePatterns: RemotePattern[] = [
  ...REMOTE_IMAGE_EXACT_HOSTS.map((hostname) => ({
    protocol: "https" as const,
    hostname,
  })),
  ...REMOTE_IMAGE_SUFFIX_HOSTS.map((hostname) => ({
    protocol: "https" as const,
    hostname: `*.${hostname}`,
  })),
];

export function isAllowedRemoteImageSrc(src: string): boolean {
  if (src.startsWith("/") || src.startsWith("data:")) {
    return true;
  }
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") {
      return false;
    }
    return hostnameMatchesAllowlist(url.hostname);
  } catch {
    return false;
  }
}
