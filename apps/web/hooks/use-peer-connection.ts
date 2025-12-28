"use client";

import { useRef, useCallback, useEffect } from "react";
import { createPeerConnection, closePeerConnection } from "@/lib/webrtc";

export interface PeerConnectionCallbacks {
  onTrack: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

/**
 * Hook for managing RTCPeerConnection lifecycle
 * Handles peer connection creation, signaling, and cleanup
 */
export function usePeerConnection(iceServers: RTCIceServer[]) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callbacksRef = useRef<PeerConnectionCallbacks | null>(null);

  /**
   * Check if peer connection is in a valid state
   */
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

  /**
   * Initialize peer connection with local stream
   */
  const initializePeerConnection = useCallback(
    (localStream: MediaStream, callbacks: PeerConnectionCallbacks): RTCPeerConnection => {
      // Clean up existing connection
      if (pcRef.current) {
        closePeerConnection(pcRef.current);
      }

      // Create new peer connection
      const pc = createPeerConnection(iceServers);
      pcRef.current = pc;
      callbacksRef.current = callbacks;

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Set up event handlers
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
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
        // Ensure this is still the current connection
        if (pcRef.current !== pc) return;

        console.log("Peer connection state changed:", pc.connectionState);
        if (callbacksRef.current) {
          callbacksRef.current.onConnectionStateChange(pc.connectionState);
        }
      };

      pc.oniceconnectionstatechange = () => {
        // Ensure this is still the current connection
        if (pcRef.current !== pc) return;

        console.log("ICE connection state changed:", pc.iceConnectionState);
        if (callbacksRef.current) {
          callbacksRef.current.onIceConnectionStateChange(pc.iceConnectionState);
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pcRef.current !== pc) return;
        console.log("ICE gathering state changed:", pc.iceGatheringState);
      };

      return pc;
    },
    [iceServers]
  );

  /**
   * Create and send SDP offer
   */
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

  /**
   * Handle incoming SDP offer and create answer
   */
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

  /**
   * Handle incoming SDP answer
   */
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc || !isConnectionValid()) {
      throw new Error("Peer connection not ready");
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, [isConnectionValid]);

  /**
   * Add ICE candidate received from peer
   */
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc || !isConnectionValid()) {
      console.warn("ICE candidate received but connection is not valid, ignoring");
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("ICE candidate added successfully");
    } catch (err) {
      // Only log if connection is still valid
      if (isConnectionValid()) {
        console.warn("Failed to add ICE candidate:", err);
      }
    }
  }, [isConnectionValid]);

  /**
   * Close peer connection and clean up
   */
  const closePeer = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    callbacksRef.current = null;
  }, []);

  /**
   * Get current peer connection
   */
  const getPeerConnection = useCallback((): RTCPeerConnection | null => {
    return pcRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePeer();
    };
  }, [closePeer]);

  return {
    initializePeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    closePeer,
    isConnectionValid,
    getPeerConnection,
    pcRef,
  };
}

