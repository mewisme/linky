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
} from "@/features/call/lib/webrtc/cloudflare-sfu-client";
import { isApiError } from "@/lib/http/api-error";
import type { RealtimePeerTracksPayload } from "@/lib/realtime/socket";

const CLOUDFLARE_STUN: RTCIceServer = { urls: "stun:stun.cloudflare.com:3478" };
const ICE_CONNECTED_TIMEOUT_MS = 10_000;

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

function waitForIceConnected(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pc.removeEventListener("iceconnectionstatechange", onStateChange);
      reject(new Error("ICE connection timed out"));
    }, timeoutMs);

    const onStateChange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        clearTimeout(timeoutId);
        pc.removeEventListener("iceconnectionstatechange", onStateChange);
        resolve();
      } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        clearTimeout(timeoutId);
        pc.removeEventListener("iceconnectionstatechange", onStateChange);
        reject(new Error(`ICE connection ${pc.iceConnectionState}`));
      }
    };
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
  const subscribeInFlightRef = useRef<Promise<void> | null>(null);
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

  const subscribePeerTracks = useCallback(async () => {
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    const roomId = roomIdRef.current;
    const socketId = socketIdRef.current;
    if (!pc || !sessionId || !roomId || !socketId) return;

    if (subscribeInFlightRef.current) {
      await subscribeInFlightRef.current;
      return;
    }

    const promise = (async () => {
      const token = await getTokenRef.current();
      const response = await subscribeRealtimeTracks(token, { roomId, socketId, sessionId });

      const pendingMids = new Set(
        (response.tracks ?? [])
          .map((t) => t.mid)
          .filter((mid): mid is string => typeof mid === "string"),
      );

      const trackWaiters =
        pendingMids.size > 0
          ? Promise.all(
            Array.from(pendingMids).map(
              (mid) =>
                new Promise<void>((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    pc.removeEventListener("track", onTrack);
                    reject(new Error(`Timed out waiting for track mid=${mid}`));
                  }, ICE_CONNECTED_TIMEOUT_MS);

                  const onTrack = (event: RTCTrackEvent) => {
                    if (event.transceiver.mid !== mid) return;
                    clearTimeout(timeoutId);
                    pc.removeEventListener("track", onTrack);
                    resolve();
                  };
                  pc.addEventListener("track", onTrack);
                }),
            ),
          )
          : Promise.resolve();

      const renegotiate = (answer: CloudflareSdpDescription) =>
        renegotiateRealtimeSession(token, { roomId, socketId, sessionId, sdp: answer });

      if (response.requiresImmediateRenegotiation && response.sessionDescription?.type === "offer") {
        await applyRemoteOfferAndAnswer(pc, response.sessionDescription, renegotiate);
      } else if (response.sessionDescription?.type === "offer") {
        await pc.setRemoteDescription(response.sessionDescription);
      }

      await trackWaiters;
      await waitForIceConnected(pc, ICE_CONNECTED_TIMEOUT_MS);
    })();

    subscribeInFlightRef.current = promise;
    try {
      await promise;
    } finally {
      subscribeInFlightRef.current = null;
    }
  }, [wireRemoteTrack]);

  const handlePeerTracks = useCallback(
    async (data: RealtimePeerTracksPayload) => {

      console.info("[debug] handlePeerTracks", {
        peerSessionId: data?.peerSessionId,
        trackCount: data?.tracks?.length ?? 0,
        hasSession: Boolean(sessionIdRef.current),
        hasPc: Boolean(pcRef.current),
      });
      if (!data?.peerSessionId || data.tracks.length === 0) return;
      if (!sessionIdRef.current || !pcRef.current) {
        pendingPeerTracksRef.current = data;
        return;
      }
      try {
        await subscribePeerTracks();
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          return;
        }
        Sentry.logger.error("Failed to subscribe to peer tracks", { error });
        throw error;
      }
    },
    [subscribePeerTracks],
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

        const iceConnected = waitForIceConnected(pc, ICE_CONNECTED_TIMEOUT_MS);

        const publishResponse = await publishRealtimeTracks(token, {
          roomId,
          socketId,
          sessionId: sessionResponse.sessionId,
          sdp: { type: "offer", sdp: pc.localDescription?.sdp ?? offer.sdp ?? "" },
          tracks: publishTracks,
        });

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
          if (hasAnyTracks) {
            try {
              await subscribePeerTracks();
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
      } finally {
        connectInFlightRef.current = false;
      }
    },
    [cleanup, subscribePeerTracks, wireRemoteTrack, flushPendingPeerTracks],
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
