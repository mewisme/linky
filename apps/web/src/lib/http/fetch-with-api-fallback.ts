import { publicEnv } from "@/shared/env/public-env";

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);

function stripTrailingSlash(base: string): string {
  return base.replace(/\/$/, "");
}

function candidateUpstreamUrls(requestUrl: string): string[] {
  const primary = stripTrailingSlash(publicEnv.API_URL);
  const dev = publicEnv.API_URL_DEV;
  const out: string[] = [];
  const add = (u: string) => {
    if (!out.includes(u)) out.push(u);
  };
  add(requestUrl);
  if (dev && requestUrl.startsWith(primary)) {
    add(requestUrl.replace(primary, dev));
  }
  return out;
}

export async function fetchWithApiFallback(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input.href;
  const candidates = candidateUpstreamUrls(url);
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const target = candidates[i]!;
    try {
      const response = await fetch(target, init);
      const tryNext =
        i < candidates.length - 1 && GATEWAY_RETRY_STATUSES.has(response.status);
      if (tryNext) {
        await response.arrayBuffer().catch(() => undefined);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (i < candidates.length - 1) {
        continue;
      }
    }
  }

  if (lastError !== undefined) {
    throw lastError;
  }
  throw new Error("fetchWithApiFallback exhausted candidates without response");
}
