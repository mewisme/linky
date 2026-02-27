"use client";

import * as Sentry from "@sentry/nextjs";

import { closePeerConnection, createPeerConnection } from "@/lib/webrtc/webrtc";
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface PeerConnectionCallbacks {
  onTrack: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

export interface UsePeerConnectionReturn {
  initializePeerConnection: (localStream: MediaStream, callbacks: PeerConnectionCallbacks, servers?: RTCIceServer[]) => RTCPeerConnection;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  handleOffer: (offer: RTCSessionDescriptionInit, isIceRestart?: boolean) => Promise<RTCSessionDescriptionInit>;
  handleAnswer: (answer: RTCSessionDescriptionInit, isIceRestart?: boolean) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  updateIceServers: (newIceServers: RTCIceServer[]) => Promise<void>;
  restartIce: () => Promise<RTCSessionDescriptionInit>;
  replaceVideoTrack: (newTrack: MediaStreamTrack) => Promise<void>;
  closePeer: () => void;
  isConnectionValid: () => boolean;
  getPeerConnection: () => RTCPeerConnection | null;
  getIceRestartInProgress?: () => boolean;
  setIceRestartInProgress?: (value: boolean) => void;
}

export function usePeerConnection(iceServers: RTCIceServer[]): UsePeerConnectionReturn {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callbacksRef = useRef<PeerConnectionCallbacks | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef<boolean>(false);
  const initializingRef = useRef<boolean>(false);
  const iceRestartInProgressRef = useRef<boolean>(false);
  const iceServersRef = useRef<RTCIceServer[]>(iceServers);

  useEffect(() => {
    if (iceServers && iceServers.length > 0) {
      iceServersRef.current = iceServers;
    }
  }, [iceServers]);

  const isConnectionValid = useCallback((): boolean => {
    const pc = pcRef.current;
    if (!pc) return false;

    const signalingState = pc.signalingState as string;
    const connectionState = pc.connectionState as string;

    return (
      signalingState !== "closed" &&
      connectionState !== "closed" &&
      connectionState !== "failed"
    );
  }, []);

  const initializePeerConnection = useCallback(
    (localStream: MediaStream, callbacks: PeerConnectionCallbacks, servers?: RTCIceServer[]): RTCPeerConnection => {
      if (initializingRef.current) {
        Sentry.logger.warn("PeerConnection initialization already in progress, skipping");
        return pcRef.current!;
      }

      if (pcRef.current) {
        closePeerConnection(pcRef.current);
      }

      if (servers && servers.length > 0) {
        iceServersRef.current = servers;
      }

      const currentIceServers = iceServersRef.current;
      if (!currentIceServers || currentIceServers.length === 0) {
        throw new Error("ICE servers must be provided before initializing PeerConnection");
      }

      initializingRef.current = true;
      pendingIceCandidatesRef.current = [];
      remoteDescriptionSetRef.current = false;

      const pc = createPeerConnection(currentIceServers);
      pcRef.current = pc;
      callbacksRef.current = callbacks;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        Sentry.logger.info("Received remote track", { track: event.track.kind });
        const [remoteStream] = event.streams;
        if (remoteStream && callbacksRef.current) {
          callbacksRef.current.onTrack(remoteStream);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && callbacksRef.current) {
          callbacksRef.current.onIceCandidate(event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;

        Sentry.logger.info("Peer connection state changed", { state: pc.connectionState });
        if (callbacksRef.current) {
          callbacksRef.current.onConnectionStateChange(pc.connectionState);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pcRef.current !== pc) return;

        Sentry.logger.info("ICE connection state changed", { state: pc.iceConnectionState });
        if (callbacksRef.current) {
          callbacksRef.current.onIceConnectionStateChange(pc.iceConnectionState);
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pcRef.current !== pc) return;
        Sentry.logger.info("ICE gathering state changed", { state: pc.iceGatheringState });
      };

      initializingRef.current = false;
      return pc;
    },
    []
  );

  const createOffer = useCallback(async (options?: { iceRestart?: boolean }): Promise<RTCSessionDescriptionInit> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    if (pc.signalingState === "closed") {
      throw new Error("Peer connection is closed");
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: options?.iceRestart ?? false,
    });
    await pc.setLocalDescription(offer);

    if (options?.iceRestart) {
      Sentry.logger.info("ICE restart offer created");
      remoteDescriptionSetRef.current = false;
    }

    return offer;
  }, []);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, isIceRestart?: boolean): Promise<RTCSessionDescriptionInit> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    if (pc.signalingState === "closed") {
      throw new Error("Peer connection is closed");
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescriptionSetRef.current = true;

    if (isIceRestart) {
      Sentry.logger.info("Processing ICE restart offer - clearing old ICE candidates");
      pendingIceCandidatesRef.current = [];
      iceRestartInProgressRef.current = true;
    }

    const pendingCandidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        Sentry.logger.info("Added buffered ICE candidate");
      } catch (err) {
        Sentry.logger.warn("Failed to add buffered ICE candidate", { error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }, []);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, isIceRestart?: boolean): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    if (pc.signalingState === "closed") {
      throw new Error("Peer connection is closed");
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    remoteDescriptionSetRef.current = true;

    if (isIceRestart) {
      Sentry.logger.info("ICE restart answer processed");
      iceRestartInProgressRef.current = false;
    }

    const pendingCandidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        Sentry.logger.info("Added buffered ICE candidate");
      } catch (err) {
        Sentry.logger.warn("Failed to add buffered ICE candidate", { error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) {
      Sentry.logger.warn("ICE candidate received but peer connection not initialized, buffering");
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    if (pc.signalingState === "closed") {
      Sentry.logger.warn("ICE candidate received but peer connection is closed, ignoring");
      return;
    }

    if (!remoteDescriptionSetRef.current) {
      Sentry.logger.info("ICE candidate received before remote description, buffering");
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      Sentry.logger.info("ICE candidate added successfully");
    } catch (err) {
      Sentry.logger.warn("Failed to add ICE candidate", { error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, []);

  const updateIceServers = useCallback(async (newIceServers: RTCIceServer[]): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    if (pc.signalingState === "closed") {
      throw new Error("Peer connection is closed");
    }

    if (!newIceServers || newIceServers.length === 0) {
      throw new Error("ICE servers must be provided");
    }

    try {
      pc.setConfiguration({
        iceServers: newIceServers,
        iceCandidatePoolSize: pc.getConfiguration().iceCandidatePoolSize,
      });
      iceServersRef.current = newIceServers;
      Sentry.logger.info("ICE servers updated via setConfiguration");
    } catch (err) {
      Sentry.logger.error("Failed to update ICE servers", { error: err instanceof Error ? err.message : "Unknown error" });
      throw err;
    }
  }, []);

  const restartIce = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    if (pc.signalingState === "closed") {
      throw new Error("Peer connection is closed");
    }

    if (iceRestartInProgressRef.current) {
      Sentry.logger.warn("ICE restart already in progress, skipping");
      throw new Error("ICE restart already in progress");
    }

    iceRestartInProgressRef.current = true;
    Sentry.logger.info("Starting ICE restart");

    try {
      const offer = await createOffer({ iceRestart: true });
      return offer;
    } catch (error) {
      iceRestartInProgressRef.current = false;
      Sentry.logger.error("Failed to create offer during ICE restart", { error });
      throw error;
    }
  }, [createOffer]);

  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track?.kind === "video");
    if (videoSender) {
      await videoSender.replaceTrack(newTrack);
    }
  }, []);

  const closePeer = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    callbacksRef.current = null;
    pendingIceCandidatesRef.current = [];
    remoteDescriptionSetRef.current = false;
    initializingRef.current = false;
    iceRestartInProgressRef.current = false;
  }, []);

  const getPeerConnection = useCallback((): RTCPeerConnection | null => {
    return pcRef.current;
  }, []);

  const getIceRestartInProgress = useCallback((): boolean => {
    return iceRestartInProgressRef.current;
  }, []);

  const setIceRestartInProgress = useCallback((value: boolean) => {
    iceRestartInProgressRef.current = value;
  }, []);

  return useMemo(
    () => ({
      initializePeerConnection,
      createOffer,
      handleOffer,
      handleAnswer,
      addIceCandidate,
      updateIceServers,
      restartIce,
      replaceVideoTrack,
      closePeer,
      isConnectionValid,
      getPeerConnection,
      getIceRestartInProgress,
      setIceRestartInProgress,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}
