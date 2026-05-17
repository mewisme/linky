"use client";

import { backendUrl } from "@/lib/http/backend-url";
import { fetchWithApiFallback } from "@/lib/http/fetch-with-api-fallback";
import { ApiError, parseApiErrorBody } from "@/lib/http/api-error";

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
  const response = await fetchWithApiFallback(url, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    const parsed = parseApiErrorBody(text || "");
    throw new ApiError(parsed.message || response.statusText, {
      status: response.status,
      userMessage: parsed.userMessage,
      rawBody: text,
    });
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function createRealtimeSession(
  token: string | null,
  payload: { roomId: string; socketId: string },
): Promise<RealtimeSessionResponse> {
  return send<RealtimeSessionResponse>("POST", backendUrl.videoChat.realtime.session(), token, payload);
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
  return send<RealtimeNegotiateResponse>("POST", backendUrl.videoChat.realtime.publish(), token, payload);
}

export async function subscribeRealtimeTracks(
  token: string | null,
  payload: { roomId: string; socketId: string; sessionId: string },
): Promise<RealtimeNegotiateResponse> {
  return send<RealtimeNegotiateResponse>("POST", backendUrl.videoChat.realtime.subscribe(), token, payload);
}

export async function renegotiateRealtimeSession(
  token: string | null,
  payload: { roomId: string; socketId: string; sessionId: string; sdp: CloudflareSdpDescription },
): Promise<{ ok: boolean; errorCode?: string; errorDescription?: string }> {
  try {
    return await send<{ ok: boolean; errorCode?: string; errorDescription?: string }>(
      "PUT",
      backendUrl.videoChat.realtime.renegotiate(),
      token,
      payload,
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 410 || error.status === 404)) {
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
    return await send<{ ok: boolean }>("POST", backendUrl.videoChat.realtime.cleanup(), token, payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { ok: true };
    }
    throw error;
  }
}
