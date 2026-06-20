"use client";

import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { apiErrorFromResponseText, isApiError } from "@/lib/http/api-error";

const REALTIME_PROXY = {
  session: "/api/video-chat/realtime/session",
  publish: "/api/video-chat/realtime/publish",
  subscribe: "/api/video-chat/realtime/subscribe",
  renegotiate: "/api/video-chat/realtime/renegotiate",
  cleanup: "/api/video-chat/realtime/cleanup",
} as const;

export interface CloudflareSdpDescription {
  sdp: string;
  type: "offer" | "answer";
}

export interface RealtimeTrackResponse {
  trackName?: string;
  mid?: string;
  kind?: "audio" | "video";
  errorCode?: string;
  errorDescription?: string;
}

export interface RealtimeNegotiateResponse {
  sessionDescription?: CloudflareSdpDescription;
  tracks?: RealtimeTrackResponse[];
  requiresImmediateRenegotiation?: boolean;
}

export interface RealtimePeerSnapshot {
  peerSessionId: string | null;
  tracks: {
    trackName: string;
    kind: "audio" | "video";
    source: "camera" | "microphone" | "screen" | "screen-audio" | "unknown";
  }[];
}

export interface RealtimeSessionResponse {
  sessionId: string;
  peer: RealtimePeerSnapshot;
}

async function send<T>(
  method: "POST" | "PUT",
  url: string,
  token: string | null,
  body: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetchWithApiFallback(url, {
    method,
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw apiErrorFromResponseText(text, response.status, response.statusText);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function createRealtimeSession(
  token: string | null,
  payload: { roomId: string; socketId: string },
): Promise<RealtimeSessionResponse> {
  return send<RealtimeSessionResponse>(
    "POST",
    REALTIME_PROXY.session,
    token,
    payload,
  );
}

export interface RealtimePublishTrack {
  mid: string;
  trackName: string;
  kind: "audio" | "video";
}

export async function publishRealtimeTracks(
  token: string | null,
  payload: {
    roomId: string;
    socketId: string;
    sessionId: string;
    sdp: CloudflareSdpDescription;
    tracks: RealtimePublishTrack[];
  },
): Promise<RealtimeNegotiateResponse> {
  return send<RealtimeNegotiateResponse>(
    "POST",
    REALTIME_PROXY.publish,
    token,
    payload,
  );
}

export async function subscribeRealtimeTracks(
  token: string | null,
  payload: { roomId: string; socketId: string; sessionId: string },
): Promise<RealtimeNegotiateResponse> {
  return send<RealtimeNegotiateResponse>(
    "POST",
    REALTIME_PROXY.subscribe,
    token,
    payload,
  );
}

export async function renegotiateRealtimeSession(
  token: string | null,
  payload: {
    roomId: string;
    socketId: string;
    sessionId: string;
    sdp: CloudflareSdpDescription;
  },
): Promise<{ ok: boolean; errorCode?: string; errorDescription?: string }> {
  try {
    return await send<{
      ok: boolean;
      errorCode?: string;
      errorDescription?: string;
    }>("PUT", REALTIME_PROXY.renegotiate, token, payload);
  } catch (error) {
    if (isApiError(error) && (error.status === 410 || error.status === 404)) {
      return { ok: true };
    }
    throw error;
  }
}

export async function cleanupRealtimeSession(
  token: string | null,
  payload: { roomId: string; socketId: string },
): Promise<{ ok: boolean }> {
  try {
    return await send<{ ok: boolean }>(
      "POST",
      REALTIME_PROXY.cleanup,
      token,
      payload,
    );
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return { ok: true };
    }
    throw error;
  }
}
