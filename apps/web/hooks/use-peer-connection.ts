"use client";

import { closePeerConnection, createPeerConnection } from "@/lib/webrtc";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { logger } from "@/utils/logger";

export interface PeerConnectionCallbacks {
  onTrack: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

export function usePeerConnection(iceServers: RTCIceServer[]) {
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
    (localStream: MediaStream, callbacks: PeerConnectionCallbacks): RTCPeerConnection => {
      if (initializingRef.current) {
        logger.warn("PeerConnection initialization already in progress, skipping");
        return pcRef.current!;
      }

      if (pcRef.current) {
        closePeerConnection(pcRef.current);
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
        logger.info("Received remote track:", event.track.kind);
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

        logger.info("Peer connection state changed:", pc.connectionState);
        if (callbacksRef.current) {
          callbacksRef.current.onConnectionStateChange(pc.connectionState);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pcRef.current !== pc) return;

        logger.info("ICE connection state changed:", pc.iceConnectionState);
        if (callbacksRef.current) {
          callbacksRef.current.onIceConnectionStateChange(pc.iceConnectionState);
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pcRef.current !== pc) return;
        logger.info("ICE gathering state changed:", pc.iceGatheringState);
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
      logger.info("ICE restart offer created");
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
      logger.info("Processing ICE restart offer - clearing old ICE candidates");
      pendingIceCandidatesRef.current = [];
    }

    const pendingCandidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        logger.info("Added buffered ICE candidate");
      } catch (err) {
        logger.warn("Failed to add buffered ICE candidate:", err);
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
      logger.info("ICE restart answer processed");
      iceRestartInProgressRef.current = false;
    }

    const pendingCandidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        logger.info("Added buffered ICE candidate");
      } catch (err) {
        logger.warn("Failed to add buffered ICE candidate:", err);
      }
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) {
      logger.warn("ICE candidate received but peer connection not initialized, buffering");
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    if (pc.signalingState === "closed") {
      logger.warn("ICE candidate received but peer connection is closed, ignoring");
      return;
    }

    if (!remoteDescriptionSetRef.current) {
      logger.info("ICE candidate received before remote description, buffering");
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      logger.info("ICE candidate added successfully");
    } catch (err) {
      logger.warn("Failed to add ICE candidate:", err);
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
      logger.info("ICE servers updated via setConfiguration");
    } catch (err) {
      logger.error("Failed to update ICE servers:", err);
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
      logger.warn("ICE restart already in progress, skipping");
      throw new Error("ICE restart already in progress");
    }

    iceRestartInProgressRef.current = true;
    logger.info("Starting ICE restart");

    try {
      const offer = await createOffer({ iceRestart: true });
      return offer;
    } catch (err) {
      iceRestartInProgressRef.current = false;
      throw err;
    }
  }, [createOffer]);

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

  useEffect(() => {
    return () => {
      closePeer();
    };
  }, [closePeer]);

  return useMemo(
    () => ({
      initializePeerConnection,
      createOffer,
      handleOffer,
      handleAnswer,
      addIceCandidate,
      updateIceServers,
      restartIce,
      closePeer,
      isConnectionValid,
      getPeerConnection,
      pcRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

