import { isApiError } from "@/lib/http/api-error";

import type {
  CloudflareSdpDescription,
  RealtimeNegotiateResponse,
} from "./cloudflare-sfu-client";

export const SESSION_NOT_READY_RETRY_DELAYS_MS = [
  500, 1000, 2000, 4000, 8000,
] as const;

export function isCloudflareSessionNotReady(error: unknown): boolean {
  if (isApiError(error)) {
    if (error.status === 425) return true;
    const code = error.userMessage?.code;
    if (code === "REALTIME_SESSION_NOT_READY" || code === "session_error")
      return true;
    if (error.message.includes("Session is not ready yet")) return true;
    if (error.message.includes("425 Too Early")) return true;
  }
  if (error instanceof Error) {
    if (error.message.includes("Session is not ready yet")) return true;
    if (error.message.includes("425 Too Early")) return true;
    if (error.message.includes("REALTIME_SESSION_NOT_READY")) return true;
  }
  return false;
}

export function retryDelayWithJitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * 200);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PeerConnectionStateSnapshot {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
}

export function snapshotPeerConnectionState(
  pc: RTCPeerConnection,
): PeerConnectionStateSnapshot {
  return {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    signalingState: pc.signalingState,
  };
}

export interface SubscribeWithRetryDeps {
  waitForPeerReady: () => Promise<void>;
  subscribe: () => Promise<RealtimeNegotiateResponse>;
  applySubscribeOffer: (offer: CloudflareSdpDescription) => Promise<void>;
  onAttempt?: (context: {
    attempt: number;
    peerSessionId: string;
    sessionId: string;
    pcState?: PeerConnectionStateSnapshot;
  }) => void;
  onSuccess?: (context: {
    attempt: number;
    peerSessionId: string;
    sessionId: string;
    hasSessionDescription: boolean;
    renegotiated: boolean;
  }) => void;
  delay?: (ms: number) => Promise<void>;
}

export async function subscribeWithSessionReadyRetry(
  deps: SubscribeWithRetryDeps,
  meta: { sessionId: string; peerSessionId: string },
): Promise<RealtimeNegotiateResponse> {
  const delay = deps.delay ?? sleep;
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= SESSION_NOT_READY_RETRY_DELAYS_MS.length;
    attempt++
  ) {
    deps.onAttempt?.({
      attempt: attempt + 1,
      peerSessionId: meta.peerSessionId,
      sessionId: meta.sessionId,
    });

    await deps.waitForPeerReady();

    try {
      const response = await deps.subscribe();
      let renegotiated = false;

      if (response.sessionDescription?.type === "offer") {
        await deps.applySubscribeOffer(response.sessionDescription);
        renegotiated = true;
      }

      deps.onSuccess?.({
        attempt: attempt + 1,
        peerSessionId: meta.peerSessionId,
        sessionId: meta.sessionId,
        hasSessionDescription: Boolean(response.sessionDescription),
        renegotiated,
      });

      return response;
    } catch (error) {
      if (
        !isCloudflareSessionNotReady(error) ||
        attempt === SESSION_NOT_READY_RETRY_DELAYS_MS.length
      ) {
        throw error;
      }
      lastError = error;
      await delay(
        retryDelayWithJitter(SESSION_NOT_READY_RETRY_DELAYS_MS[attempt]!),
      );
    }
  }

  throw lastError ?? new Error("Subscribe failed after session-ready retries");
}

export class PeerSubscribeGuard {
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly subscribed = new Set<string>();

  isSubscribed(peerKey: string): boolean {
    return this.subscribed.has(peerKey);
  }

  hasInFlight(peerKey: string): boolean {
    return this.inFlight.has(peerKey);
  }

  async run(peerKey: string, fn: () => Promise<void>): Promise<void> {
    if (this.subscribed.has(peerKey)) {
      return;
    }

    const existing = this.inFlight.get(peerKey);
    if (existing) {
      await existing;
      return;
    }

    const promise = (async () => {
      try {
        await fn();
        this.subscribed.add(peerKey);
      } finally {
        this.inFlight.delete(peerKey);
      }
    })();

    this.inFlight.set(peerKey, promise);
    await promise;
  }

  reset(): void {
    this.inFlight.clear();
    this.subscribed.clear();
  }
}
