"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { useAuthClient } from "@/hooks/use-auth-client";
import { fetchIceServers } from "@/lib/webrtc";
import type { SignalData } from "@/lib/socket";

// Sub-hooks
import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useSocketSignaling } from "./use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";

/**
 * Public API interface for the video chat hook
 */
export interface UseVideoChatReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  chatMessages: ChatMessage[];
  sendMessage: (message: string) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  error: string | null;
}

/**
 * Main video chat hook - orchestrates all sub-hooks
 * Optimized for performance with minimal re-renders
 */
export function useVideoChat(): UseVideoChatReturn {
  const { getToken, isLoaded } = useAuth();
  useAuthClient(); // Set up axios client with Clerk authentication

  // Initialize all sub-hooks
  const { state, actions } = useVideoChatState();
  const iceServersRef = useRef<RTCIceServer[]>([]);
  
  // Store actions in ref to avoid recreating callbacks
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  
  // Media stream management
  const mediaStream = useMediaStream();
  
  // Peer connection management
  const peerConnection = usePeerConnection(iceServersRef.current);
  
  // Socket signaling management
  const socketSignaling = useSocketSignaling();

  /**
   * Initialize ICE servers on mount
   */
  useEffect(() => {
    let mounted = true;

    async function initIceServers() {
      if (!isLoaded) return;

      try {
        const servers = await fetchIceServers();
        if (mounted) {
          iceServersRef.current = servers;
        }
      } catch (err) {
        console.error("Failed to fetch ICE servers:", err);
        if (mounted) {
          actions.setError("Failed to initialize connection. Please refresh the page.");
        }
      }
    }

    initIceServers();

    return () => {
      mounted = false;
    };
  }, [isLoaded, actions]);

  /**
   * Reset peer state without disconnecting socket
   */
  const resetPeerState = useCallback(() => {
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    actions.resetPeerState();
    actions.setLocalStream(null);
  }, [mediaStream, peerConnection, actions]);

  /**
   * Full cleanup - disconnects everything
   */
  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Handle peer connection callbacks
   */
  const peerCallbacks = useMemo(
    () => ({
      onTrack: (stream: MediaStream) => {
        actionsRef.current.setRemoteStream(stream);
        actionsRef.current.setConnectionStatus("connected");
        console.log("Remote stream set, connection status: connected");
        toast.success("Connected! You are now connected with your peer.");
      },
      onIceCandidate: (candidate: RTCIceCandidate) => {
        socketSignaling.sendSignal({
          type: "ice-candidate",
          candidate: candidate.toJSON(),
        });
      },
      onConnectionStateChange: (connectionState: RTCPeerConnectionState) => {
        if (connectionState === "disconnected" || connectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
        } else if (connectionState === "connected") {
          actionsRef.current.setConnectionStatus("connected");
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        if (iceConnectionState === "failed" || iceConnectionState === "disconnected") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
        }
      },
    }),
    [socketSignaling]
  );

  /**
   * Handle socket signaling callbacks
   */
  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => {
        // Socket connected successfully
      },

      onDisconnect: () => {
        // Use ref to avoid dependency on state
        actionsRef.current.setConnectionStatus("peer-disconnected");
      },

      onConnectError: () => {
        actionsRef.current.setError("Failed to connect to server. Please refresh the page.");
        toast.error("Connection failed - Failed to connect to server. Please refresh the page.");
      },

      onSessionWaiting: (data: { message: string; positionInQueue: number; queueSize: number }) => {
        actionsRef.current.setError(`Session queued - ${data.message}. Position in queue: ${data.positionInQueue}/${data.queueSize}`);
        toast(`Session queued - ${data.message}. Position in queue: ${data.positionInQueue}/${data.queueSize}`);
        actionsRef.current.setConnectionStatus("idle");
      },

      onSessionActivated: (data: { message: string }) => {
        actionsRef.current.setError(null);
        toast.success(data.message);
      },

      onJoinedQueue: (data: { message: string; queueSize: number }) => {
        console.log("[SUCCESS] Joined queue:", data);
        actionsRef.current.setConnectionStatus("searching");
      },

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean }) => {
        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("connecting");
        toast.success("Peer matched! Connecting to peer...");

        const localStream = mediaStream.getStream();
        if (!localStream) {
          console.error("No local stream available for match");
          return;
        }

        // Initialize peer connection
        peerConnection.initializePeerConnection(localStream, peerCallbacks);

        // If we're the offerer, create and send offer
        if (data.isOfferer) {
          try {
            console.log("Creating offer as offerer...");
            const offer = await peerConnection.createOffer();
            socketSignaling.sendSignal({
              type: "offer",
              sdp: offer,
            });
            console.log("[SUCCESS] Offer created and sent to peer");
          } catch (err) {
            console.error("[ERROR] Error creating offer:", err);
            actionsRef.current.setError("Failed to establish connection. Please try again.");
            actionsRef.current.setConnectionStatus("peer-disconnected");
          }
        } else {
          console.log("[WAITING] Waiting for offer from peer as answerer...");
        }
      },

      onSignal: async (data: SignalData) => {
        if (!peerConnection.isConnectionValid()) {
          console.warn("Signal received but peer connection not ready");
          return;
        }

        try {
          if (data.type === "offer") {
            console.log("[RECEIVED] Received offer, creating answer...");
            const answer = await peerConnection.handleOffer(data.sdp as RTCSessionDescriptionInit);
            socketSignaling.sendSignal({
              type: "answer",
              sdp: answer,
            });
            console.log("[SUCCESS] Answer created and sent to peer");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "answer") {
            console.log("[RECEIVED] Received answer, setting remote description...");
            await peerConnection.handleAnswer(data.sdp as RTCSessionDescriptionInit);
            console.log("[SUCCESS] Remote description set successfully");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "ice-candidate" && data.candidate) {
            console.log("[ICE] Received ICE candidate, adding...");
            await peerConnection.addIceCandidate(data.candidate);
          }
        } catch (err) {
          if (peerConnection.isConnectionValid()) {
            console.error("Error handling signal:", err);
            actionsRef.current.setError("Failed to process connection signal. Please try again.");
          } else {
            console.warn("Signal processing error but connection is closed, ignoring:", err);
          }
        }
      },

      onPeerLeft: (data: { message: string }) => {
        peerConnection.closePeer();
        actionsRef.current.setConnectionStatus("peer-disconnected");
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        toast.error(`Peer disconnected - ${data.message}`);
      },

      onPeerSkipped: (data: { message: string; queueSize: number }) => {
        peerConnection.closePeer();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setError(null);
        toast(`Peer skipped - ${data.message}`);
      },

      onSkipped: (data: { message: string; queueSize: number }) => {
        console.log("Skipped:", data.message, "Queue size:", data.queueSize);
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
      },

      onEndCall: (data: { message: string }) => {
        console.log("End call received from peer:", data.message);
        toast(`Call ended - ${data.message}`);
        resetPeerState();
      },

      onChatMessage: (data: { message: string; timestamp: number; senderId: string }) => {
        const socketId = socketSignaling.getSocketId();
        const newMessage: ChatMessage = {
          id: `${data.senderId}-${data.timestamp}`,
          message: data.message,
          timestamp: data.timestamp,
          senderId: data.senderId,
          isOwn: data.senderId === socketId,
        };
        actionsRef.current.addChatMessage(newMessage);
      },

      onMuteToggle: (data: { muted: boolean }) => {
        actionsRef.current.setRemoteMuted(data.muted);
      },

      onQueueTimeout: (data: { message: string }) => {
        actionsRef.current.setError(data.message);
        actionsRef.current.setConnectionStatus("idle");
        toast.error(`Queue timeout - ${data.message}`);
      },

      onError: (data: { message: string }) => {
        actionsRef.current.setError(data.message);
        toast.error(`Error - ${data.message}`);
      },
    }),
    [mediaStream, peerConnection, peerCallbacks, socketSignaling, resetPeerState]
  );

  /**
   * Start video chat
   */
  const start = useCallback(async () => {
    try {
      actions.setError(null);
      actions.setConnectionStatus("searching");

      // Check authentication
      if (!isLoaded) {
        actions.setError("Authentication not ready. Please wait...");
        return;
      }

      const token = await getToken();
      if (!token) {
        actions.setError("Authentication required. Please sign in.");
        return;
      }

      // Fetch ICE servers if needed
      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await fetchIceServers();
      }

      // Acquire media stream
      const stream = await mediaStream.acquireMedia();
      actions.setLocalStream(stream);

      // Initialize peer connection
      peerConnection.initializePeerConnection(stream, peerCallbacks);

      // Initialize socket connection
      socketSignaling.initializeSocket(token, socketCallbacks);

      // Join matchmaking queue
      socketSignaling.joinQueue();
    } catch (err) {
      console.error("Error starting video chat:", err);
      actions.setError(err instanceof Error ? err.message : "Failed to start video chat");
      actions.setConnectionStatus("idle");
      cleanup();
    }
  }, [
    actions,
    isLoaded,
    getToken,
    mediaStream,
    peerConnection,
    peerCallbacks,
    socketSignaling,
    socketCallbacks,
    cleanup,
  ]);

  /**
   * Skip current peer
   */
  const skip = useCallback(() => {
    peerConnection.closePeer();
    actions.setRemoteStream(null);
    actions.clearChatMessages();
    actions.setRemoteMuted(false);
    socketSignaling.skipPeer();
  }, [peerConnection, actions, socketSignaling]);

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback(() => {
    const newMutedState = mediaStream.toggleMute();
    actions.setMuted(newMutedState);
    socketSignaling.sendMuteToggle(newMutedState);
  }, [mediaStream, actions, socketSignaling]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    const newVideoOffState = mediaStream.toggleVideo();
    actions.setVideoOff(newVideoOffState);
  }, [mediaStream, actions]);

  /**
   * Send chat message
   */
  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      const timestamp = Date.now();
      const socketId = socketSignaling.getSocketId();

      // Optimistic update
      const newMessage: ChatMessage = {
        id: `${socketId}-${timestamp}`,
        message: message.trim(),
        timestamp,
        senderId: socketId || "unknown",
        isOwn: true,
      };
      actions.addChatMessage(newMessage);

      // Send to server
      socketSignaling.sendChatMessage(message.trim(), timestamp);
    },
    [actions, socketSignaling]
  );

  /**
   * End call
   */
  const endCall = useCallback(() => {
    socketSignaling.sendEndCall();
    toast("Call ended - You have ended the call.");
    resetPeerState();
  }, [socketSignaling, resetPeerState]);

  // Return public API
  return {
    localStream: state.localStream,
    remoteStream: state.remoteStream,
    connectionStatus: state.connectionStatus,
    isMuted: state.isMuted,
    isVideoOff: state.isVideoOff,
    remoteMuted: state.remoteMuted,
    chatMessages: state.chatMessages,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    error: state.error,
  };
}

// Re-export types for convenience
export type { ConnectionStatus, ChatMessage };
