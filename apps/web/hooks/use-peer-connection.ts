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

  const isConnectionValid = useCallback((): boolean => {
    const pc = pcRef.current;
    if (!pc) return false;

    const signalingState = pc.signalingState as string;
    const connectionState = pc.connectionState as string;

    return (
      signalingState !== "closed" &&
      connectionState !== "closed" &&
      connectionState !== "failed" &&
      connectionState !== "disconnected"
    );
  }, []);

  const initializePeerConnection = useCallback(
    (localStream: MediaStream, callbacks: PeerConnectionCallbacks): RTCPeerConnection => {
      if (pcRef.current) {
        closePeerConnection(pcRef.current);
      }

      const pc = createPeerConnection(iceServers);
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

      return pc;
    },
    [iceServers]
  );

  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const pc = pcRef.current;
    if (!pc) {
      throw new Error("Peer connection not initialized");
    }

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    return offer;
  }, []);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
    const pc = pcRef.current;
    if (!pc || !isConnectionValid()) {
      throw new Error("Peer connection not ready");
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }, [isConnectionValid]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc || !isConnectionValid()) {
      throw new Error("Peer connection not ready");
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, [isConnectionValid]);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc || !isConnectionValid()) {
      logger.warn("ICE candidate received but connection is not valid, ignoring");
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      logger.info("ICE candidate added successfully");
    } catch (err) {
      if (isConnectionValid()) {
        logger.warn("Failed to add ICE candidate:", err);
      }
    }
  }, [isConnectionValid]);

  const closePeer = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    callbacksRef.current = null;
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
      closePeer,
      isConnectionValid,
      getPeerConnection,
      pcRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

