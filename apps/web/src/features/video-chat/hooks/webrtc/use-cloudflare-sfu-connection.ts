"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useRef } from "react";

import {
  cleanupRealtimeSession,
  createRealtimeSession,
  publishRealtimeTracks,
  renegotiateRealtimeSession,
  subscribeRealtimeTracks,
  type CloudflareSdpDescription,
  type RealtimePeerSnapshot,
  type RealtimePublishTrack,
} from "@/features/video-chat/lib/webrtc/cloudflare-sfu-client";
import {
  PeerSubscribeGuard,
  isCloudflareSessionNotReady,
  snapshotPeerConnectionState,
  subscribeWithSessionReadyRetry,
} from "@/features/video-chat/lib/webrtc/cloudflare-sfu-subscribe";
import { isApiError } from "@/lib/http/api-error";
import type { RealtimePeerTracksPayload } from "@/lib/realtime/socket";

const CLOUDFLARE_STUN: RTCIceServer = { urls: "stun:stun.cloudflare.com:3478" };
const PEER_READY_TIMEOUT_MS = 20_000;

export interface CloudflareSfuConnectionCallbacks {
  onTrack: (stream: MediaStream) => void;
  onRemoteMediaUpdated?: () => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

export interface UseCloudflareSfuConnectionReturn {
  connect: (params: {
    roomId: string;
    socketId: string;
    localStream: MediaStream;
    callbacks: CloudflareSfuConnectionCallbacks;
    realtimeSessionId?: string;
  }) => Promise<RTCPeerConnection>;
  handlePeerTracks: (data: RealtimePeerTracksPayload) => Promise<void>;
  cleanup: () => Promise<void>;
  getPeerConnection: () => RTCPeerConnection | null;
  getSessionId: () => string | null;
  getRoomId: () => string | null;
  getSocketId: () => string | null;
}

export interface UseCloudflareSfuConnectionOptions {
  getToken: () => Promise<string | null>;
}

function isVideoSource(source: RealtimePeerSnapshot["tracks"][number]["source"]): boolean {
  return source === "camera" || source === "screen" || source === "unknown";
}

function isPeerReady(pc: RTCPeerConnection): boolean {
  return (
    pc.connectionState === "connected" ||
    pc.iceConnectionState === "connected" ||
    pc.iceConnectionState === "completed"
  );
}

function waitForPeerReady(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (isPeerReady(pc)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Peer connection timed out"));
    }, timeoutMs);

    const onStateChange = () => {
      if (isPeerReady(pc)) {
        cleanup();
        resolve();
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed" ||
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed"
      ) {
        cleanup();
        reject(
          new Error(
            `Peer connection ${pc.connectionState} (ice=${pc.iceConnectionState})`,
          ),
        );
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      pc.removeEventListener("connectionstatechange", onStateChange);
      pc.removeEventListener("iceconnectionstatechange", onStateChange);
    };

    pc.addEventListener("connectionstatechange", onStateChange);
    pc.addEventListener("iceconnectionstatechange", onStateChange);
  });
}

async function applyRemoteOfferAndAnswer(
  pc: RTCPeerConnection,
  offer: CloudflareSdpDescription,
  renegotiate: (answer: CloudflareSdpDescription) => Promise<{ ok: boolean; errorCode?: string; errorDescription?: string }>,
): Promise<void> {
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  const result = await renegotiate({ type: "answer", sdp: answer.sdp ?? "" });
  if (!result.ok) {
    throw new Error(result.errorDescription ?? result.errorCode ?? "Renegotiation failed");
  }
}

export function useCloudflareSfuConnection(
  options: UseCloudflareSfuConnectionOptions,
): UseCloudflareSfuConnectionReturn {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callbacksRef = useRef<CloudflareSfuConnectionCallbacks | null>(null);
  const subscribeGuardRef = useRef(new PeerSubscribeGuard());
  const connectInFlightRef = useRef(false);
  const initialPeerSnapshotRef = useRef<RealtimePeerSnapshot | null>(null);
  const pendingPeerTracksRef = useRef<RealtimePeerTracksPayload | null>(null);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;

  const ensureRemoteStream = useCallback((): MediaStream => {
    let stream = remoteStreamRef.current;
    if (!stream) {
      stream = new MediaStream();
      remoteStreamRef.current = stream;
      callbacksRef.current?.onTrack(stream);
    }
    return stream;
  }, []);

  const wireRemoteTrack = useCallback(
    (event: RTCTrackEvent) => {
      const stream = ensureRemoteStream();
      stream.addTrack(event.track);
      const handleEnded = () => {
        try {
          stream.removeTrack(event.track);
        } catch {
          /* noop */
        }
      };
      event.track.addEventListener("ended", handleEnded);
      callbacksRef.current?.onRemoteMediaUpdated?.();
    },
    [ensureRemoteStream],
  );

  const logRealtime = useCallback((event: string, data: Record<string, unknown>) => {
    Sentry.logger.info(`realtime.sfu.${event}`, data);
  }, []);

  const subscribePeerTracks = useCallback(
    async (peerSessionId: string) => {
      const pc = pcRef.current;
      const sessionId = sessionIdRef.current;
      const roomId = roomIdRef.current;
      const socketId = socketIdRef.current;
      if (!pc || !sessionId || !roomId || !socketId || !peerSessionId) return;

      await subscribeGuardRef.current.run(peerSessionId, async () => {
        const token = await getTokenRef.current();

        const response = await subscribeWithSessionReadyRetry(
          {
            waitForPeerReady: () => waitForPeerReady(pc, PEER_READY_TIMEOUT_MS),
            subscribe: () => subscribeRealtimeTracks(token, { roomId, socketId, sessionId }),
            applySubscribeOffer: async (offer) => {
              const renegotiate = (answer: CloudflareSdpDescription) =>
                renegotiateRealtimeSession(token, { roomId, socketId, sessionId, sdp: answer });
              await applyRemoteOfferAndAnswer(pc, offer, renegotiate);
            },
            onAttempt: ({ attempt }) => {
              logRealtime("subscribe_attempt", {
                attempt,
                localSessionId: sessionId,
                peerSessionId,
                ...snapshotPeerConnectionState(pc),
              });
            },
            onSuccess: ({ attempt, hasSessionDescription, renegotiated }) => {
              logRealtime("subscribe_success", {
                attempt,
                localSessionId: sessionId,
                peerSessionId,
                hasSessionDescription,
                renegotiated,
                ...snapshotPeerConnectionState(pc),
              });
            },
          },
          { sessionId, peerSessionId },
        );

        const pendingMids = new Set(
          (response.tracks ?? [])
            .map((t) => t.mid)
            .filter((mid): mid is string => typeof mid === "string"),
        );

        if (pendingMids.size > 0) {
          await Promise.all(
            Array.from(pendingMids).map(
              (mid) =>
                new Promise<void>((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    pc.removeEventListener("track", onTrack);
                    reject(new Error(`Timed out waiting for track mid=${mid}`));
                  }, PEER_READY_TIMEOUT_MS);

                  const onTrack = (event: RTCTrackEvent) => {
                    if (event.transceiver.mid !== mid) return;
                    clearTimeout(timeoutId);
                    pc.removeEventListener("track", onTrack);
                    resolve();
                  };
                  pc.addEventListener("track", onTrack);
                }),
            ),
          );
        }
      });
    },
    [logRealtime],
  );

  const handlePeerTracks = useCallback(
    async (data: RealtimePeerTracksPayload) => {
      if (!data?.peerSessionId || data.tracks.length === 0) return;

      logRealtime("peer_tracks_received", {
        peerSessionId: data.peerSessionId,
        trackCount: data.tracks.length,
        localSessionId: sessionIdRef.current,
        connectInFlight: connectInFlightRef.current,
      });

      if (
        connectInFlightRef.current ||
        !sessionIdRef.current ||
        !pcRef.current
      ) {
        pendingPeerTracksRef.current = data;
        return;
      }
      try {
        await subscribePeerTracks(data.peerSessionId);
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          return;
        }
        if (isCloudflareSessionNotReady(error)) {
          console.error("[realtime-sfu] subscribe failed after session-ready retries", {
            error,
            peerSessionId: data.peerSessionId,
            localSessionId: sessionIdRef.current,
          });
          Sentry.logger.warn("Subscribe failed after session-ready retries", {
            peerSessionId: data.peerSessionId,
            localSessionId: sessionIdRef.current,
            error,
          });
        } else {
          console.error("[realtime-sfu] failed to subscribe to peer tracks", {
            error,
            peerSessionId: data.peerSessionId,
            localSessionId: sessionIdRef.current,
          });
          Sentry.logger.error("Failed to subscribe to peer tracks", { error });
        }
        throw error;
      }
    },
    [subscribePeerTracks, logRealtime],
  );

  const flushPendingPeerTracks = useCallback(async () => {
    const pending = pendingPeerTracksRef.current;
    if (!pending) return;
    pendingPeerTracksRef.current = null;
    await handlePeerTracks(pending);
  }, [handlePeerTracks]);

  const cleanup = useCallback(async () => {
    connectInFlightRef.current = false;
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      try {
        pc.getSenders().forEach((sender) => {
          try {
            sender.track?.stop();
          } catch {
            /* noop */
          }
        });
        pc.close();
      } catch {
        /* noop */
      }
    }
    remoteStreamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
    remoteStreamRef.current = null;

    const roomId = roomIdRef.current;
    const socketId = socketIdRef.current;
    sessionIdRef.current = null;
    roomIdRef.current = null;
    socketIdRef.current = null;
    callbacksRef.current = null;
    subscribeGuardRef.current.reset();
    initialPeerSnapshotRef.current = null;
    pendingPeerTracksRef.current = null;

    if (roomId && socketId) {
      try {
        const token = await getTokenRef.current();
        await cleanupRealtimeSession(token, { roomId, socketId });
      } catch (error) {
        Sentry.logger.warn("Realtime cleanup request failed", { error });
      }
    }
  }, []);

  const connect = useCallback(
    async ({
      roomId,
      socketId,
      localStream,
      callbacks,
      realtimeSessionId,
    }: {
      roomId: string;
      socketId: string;
      localStream: MediaStream;
      callbacks: CloudflareSfuConnectionCallbacks;
      realtimeSessionId?: string;
    }): Promise<RTCPeerConnection> => {
      if (pcRef.current) {
        await cleanup();
      }

      pendingPeerTracksRef.current = null;
      connectInFlightRef.current = true;

      try {
        const token = await getTokenRef.current();
        const sessionResponse = await createRealtimeSession(token, { roomId, socketId });

        if (!sessionResponse.sessionId) {
          throw new Error("Realtime session API did not return a sessionId");
        }

        if (realtimeSessionId && sessionResponse.sessionId !== realtimeSessionId) {
          Sentry.logger.warn("Realtime sessionId mismatch after matched", {
            expected: realtimeSessionId,
            actual: sessionResponse.sessionId,
          });
        }

        sessionIdRef.current = sessionResponse.sessionId;
        roomIdRef.current = roomId;
        socketIdRef.current = socketId;
        initialPeerSnapshotRef.current = sessionResponse.peer ?? null;
        callbacksRef.current = callbacks;

        const pc = new RTCPeerConnection({
          iceServers: [CLOUDFLARE_STUN],
          bundlePolicy: "max-bundle",
        });
        pcRef.current = pc;

        pc.addEventListener("track", (event) => wireRemoteTrack(event));
        pc.addEventListener("connectionstatechange", () => {
          callbacks.onConnectionStateChange(pc.connectionState);
        });

        const transceivers: RTCRtpTransceiver[] = [];
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          transceivers.push(
            pc.addTransceiver(audioTrack, {
              direction: "sendonly",
              streams: [localStream],
            }),
          );
        }

        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          transceivers.push(
            pc.addTransceiver(videoTrack, {
              direction: "sendonly",
              streams: [localStream],
              sendEncodings: [
                { rid: "f", scaleResolutionDownBy: 1 },
                { rid: "h", scaleResolutionDownBy: 2 },
                { rid: "q", scaleResolutionDownBy: 4 },
              ],
            }),
          );
        }

        if (transceivers.length === 0) {
          throw new Error("No local media tracks to publish");
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const publishTracks: RealtimePublishTrack[] = transceivers
          .map((transceiver) => {
            const track = transceiver.sender.track;
            const mid = transceiver.mid;
            if (!track || !mid) return null;
            return {
              mid,
              trackName: track.id,
              kind: track.kind === "audio" ? ("audio" as const) : ("video" as const),
            };
          })
          .filter((entry): entry is RealtimePublishTrack => entry !== null);

        if (publishTracks.length === 0) {
          throw new Error("Transceivers missing mid or track after setLocalDescription");
        }

        const publishResponse = await publishRealtimeTracks(token, {
          roomId,
          socketId,
          sessionId: sessionResponse.sessionId,
          sdp: { type: "offer", sdp: pc.localDescription?.sdp ?? offer.sdp ?? "" },
          tracks: publishTracks,
        });

        logRealtime("publish_response", {
          localSessionId: sessionResponse.sessionId,
          hasSessionDescription: Boolean(publishResponse.sessionDescription),
          requiresImmediateRenegotiation: publishResponse.requiresImmediateRenegotiation ?? false,
          ...snapshotPeerConnectionState(pc),
        });

        const iceConnected = waitForPeerReady(pc, PEER_READY_TIMEOUT_MS);

        const publishRenegotiate = (answer: CloudflareSdpDescription) =>
          renegotiateRealtimeSession(token, {
            roomId,
            socketId,
            sessionId: sessionResponse.sessionId,
            sdp: answer,
          });

        if (publishResponse.sessionDescription?.type === "answer") {
          await pc.setRemoteDescription(publishResponse.sessionDescription);
        } else if (
          publishResponse.requiresImmediateRenegotiation &&
          publishResponse.sessionDescription?.type === "offer"
        ) {
          await applyRemoteOfferAndAnswer(pc, publishResponse.sessionDescription, publishRenegotiate);
        } else {
          throw new Error("Cloudflare publish did not return a session description");
        }

        await iceConnected;

        const initialSnapshot = initialPeerSnapshotRef.current;
        if (initialSnapshot?.peerSessionId && initialSnapshot.tracks.length > 0) {
          const hasAnyTracks = initialSnapshot.tracks.some(
            (t) => isVideoSource(t.source) || t.kind === "audio",
          );
          if (hasAnyTracks && initialSnapshot.peerSessionId) {
            try {
              await subscribePeerTracks(initialSnapshot.peerSessionId);
            } catch (error) {
              if (!(isApiError(error) && error.status === 409)) {
                throw error;
              }
            }
          }
        }

        if (connectInFlightRef.current) {
          await flushPendingPeerTracks();
        }

        return pc;
      } catch (error) {
        const pc = pcRef.current;
        console.error("[realtime-sfu] connect failed", {
          error,
          roomId,
          socketId,
          sessionId: sessionIdRef.current,
          ...(pc ? snapshotPeerConnectionState(pc) : {}),
        });
        throw error;
      } finally {
        connectInFlightRef.current = false;
      }
    },
    [cleanup, subscribePeerTracks, wireRemoteTrack, flushPendingPeerTracks, logRealtime],
  );

  const getPeerConnection = useCallback(() => pcRef.current, []);
  const getSessionId = useCallback(() => sessionIdRef.current, []);
  const getRoomId = useCallback(() => roomIdRef.current, []);
  const getSocketId = useCallback(() => socketIdRef.current, []);

  return {
    connect,
    handlePeerTracks,
    cleanup,
    getPeerConnection,
    getSessionId,
    getRoomId,
    getSocketId,
  };
}
