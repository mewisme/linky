import { config } from "@/config/index.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

import {
  CloudflareRealtimeError,
  type CloudflareCloseTracksRequest,
  type CloudflareCloseTracksResponse,
  type CloudflareNewSessionRequest,
  type CloudflareNewSessionResponse,
  type CloudflareRenegotiateRequest,
  type CloudflareTracksRequest,
  type CloudflareTracksResponse,
} from "./types.js";

const logger = createLogger("infra:cloudflare-realtime");
const REQUEST_TIMEOUT_MS = 10_000;

function isStaleCloudflareSessionStatus(status: number): boolean {
  return status === 410 || status === 404;
}

function isStaleCloudflareSessionPath(path: string): boolean {
  return path.endsWith("/tracks/close") || path.endsWith("/renegotiate");
}

function ensureConfigured(): { appId: string; appSecret: string; baseUrl: string } {
  const appId = config.cloudflareRealtimeAppId;
  const appSecret = config.cloudflareRealtimeAppSecret;
  const baseUrl = config.cloudflareRealtimeBaseUrl;
  if (!appId || !appSecret) {
    throw new CloudflareRealtimeError(
      "Cloudflare Realtime is not configured (missing CLOUDFLARE_REALTIME_APP_ID or CLOUDFLARE_REALTIME_APP_SECRET)",
      500,
      "REALTIME_NOT_CONFIGURED",
    );
  }
  return { appId, appSecret, baseUrl };
}

async function callCloudflare<TResponse>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown,
): Promise<TResponse> {
  const { appSecret, baseUrl } = ensureConfigured();
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${appSecret}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorCode: string | undefined;
      let errorDescription: string | undefined;
      try {
        const parsed = JSON.parse(errorText) as {
          errorCode?: string;
          errorDescription?: string;
        };
        errorCode = parsed.errorCode;
        errorDescription = parsed.errorDescription;
      } catch {
        /* not JSON */
      }
      const detail =
        errorDescription != null
          ? `${errorCode ?? "error"}: ${errorDescription}`
          : errorText.slice(0, 512) || response.statusText;
      const staleSessionNoop =
        isStaleCloudflareSessionPath(path) && isStaleCloudflareSessionStatus(response.status);
      if (staleSessionNoop) {
        logger.debug(
          "Cloudflare Realtime stale-session noop: %s status=%d %s",
          path,
          response.status,
          detail,
        );
      } else {
        logger.error(
          "Cloudflare Realtime API error: %s %s status=%d body=%s",
          method,
          path,
          response.status,
          detail,
        );
      }
      throw new CloudflareRealtimeError(
        `Cloudflare Realtime API ${method} ${path} failed: ${response.status} (${detail})`,
        response.status,
        errorCode,
      );
    }

    const data = (await response.json()) as TResponse & {
      errorCode?: string;
      errorDescription?: string;
    };

    if (data && typeof data === "object" && "errorCode" in data && data.errorCode) {
      logger.warn(
        "Cloudflare Realtime returned errorCode: %s %s code=%s description=%s",
        method,
        path,
        data.errorCode,
        data.errorDescription ?? "",
      );
    }

    return data as TResponse;
  } catch (error: unknown) {
    if (error instanceof CloudflareRealtimeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(toLoggableError(error), "Cloudflare Realtime request timed out: %s %s", method, path);
      throw new CloudflareRealtimeError("Cloudflare Realtime request timed out", 504, "REALTIME_TIMEOUT");
    }
    logger.error(toLoggableError(error), "Cloudflare Realtime request failed: %s %s", method, path);
    throw new CloudflareRealtimeError("Cloudflare Realtime request failed", 502, "REALTIME_FETCH_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }
}

function appPath(suffix: string): string {
  const { appId } = ensureConfigured();
  return `/apps/${appId}${suffix}`;
}

export async function createSession(
  body?: CloudflareNewSessionRequest,
): Promise<CloudflareNewSessionResponse> {
  const payload =
    body?.sessionDescription != null ? { sessionDescription: body.sessionDescription } : undefined;
  return callCloudflare<CloudflareNewSessionResponse>("POST", appPath("/sessions/new"), payload);
}

export async function addTracks(
  sessionId: string,
  body: CloudflareTracksRequest,
): Promise<CloudflareTracksResponse> {
  return callCloudflare<CloudflareTracksResponse>(
    "POST",
    appPath(`/sessions/${encodeURIComponent(sessionId)}/tracks/new`),
    body,
  );
}

export async function renegotiate(
  sessionId: string,
  body: CloudflareRenegotiateRequest,
): Promise<{ errorCode?: string; errorDescription?: string }> {
  try {
    return await callCloudflare<{ errorCode?: string; errorDescription?: string }>(
      "PUT",
      appPath(`/sessions/${encodeURIComponent(sessionId)}/renegotiate`),
      body,
    );
  } catch (error) {
    if (error instanceof CloudflareRealtimeError && isStaleCloudflareSessionStatus(error.status)) {
      return {};
    }
    throw error;
  }
}

export async function closeTracks(
  sessionId: string,
  body: CloudflareCloseTracksRequest,
): Promise<CloudflareCloseTracksResponse> {
  try {
    return await callCloudflare<CloudflareCloseTracksResponse>(
      "PUT",
      appPath(`/sessions/${encodeURIComponent(sessionId)}/tracks/close`),
      body,
    );
  } catch (error) {
    if (error instanceof CloudflareRealtimeError && isStaleCloudflareSessionStatus(error.status)) {
      return {};
    }
    throw error;
  }
}

export async function getSession(sessionId: string): Promise<unknown> {
  return callCloudflare<unknown>(
    "GET",
    appPath(`/sessions/${encodeURIComponent(sessionId)}`),
  );
}

export function isCloudflareRealtimeConfigured(): boolean {
  return Boolean(config.cloudflareRealtimeAppId && config.cloudflareRealtimeAppSecret);
}
