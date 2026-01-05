"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchIceServers } from "@/lib/webrtc";
import type { SignalData } from "@/lib/socket";
import { logger } from "@/utils/logger";

import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useSocketSignaling } from "./use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";

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
  clearError: () => void;
}

export function useVideoChat(): UseVideoChatReturn {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  const { state, actions } = useVideoChatState();
  const iceServersRef = useRef<RTCIceServer[]>([]);

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();

  const peerConnection = usePeerConnection(iceServersRef.current);

  const socketSignaling = useSocketSignaling();

  useEffect(() => {
    let mounted = true;

    async function initIceServers() {
      if (!isLoaded) return;

      const token = await getToken();
      if (!token) {
        throw new Error("No token found");
      }

      try {
        const servers = await fetchIceServers(token);
        if (mounted) {
          iceServersRef.current = servers;
        }
      } catch (err) {
        logger.error("Failed to fetch ICE servers:", err);
        if (mounted) {
          actionsRef.current.setError("Failed to initialize connection. Please refresh the page.");
        }
      }
    }

    initIceServers();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    const updateToken = async () => {
      try {
        const token = await getToken();
        if (token) {
          socketSignaling.updateSocketToken(token);
          logger.info("Socket token updated");
        }
      } catch (error) {
        logger.error("Failed to update socket token:", error);
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [isLoaded, getToken, socketSignaling]);

  const resetPeerState = useCallback(() => {
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
  }, [mediaStream, peerConnection]);

  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const hasShownConnectedToastRef = useRef(false);

  const peerCallbacks = useMemo(
    () => ({
      onTrack: (stream: MediaStream) => {
        actionsRef.current.setRemoteStream(stream);
        actionsRef.current.setConnectionStatus("connected");
        logger.info("Received remote track:", stream.getTracks().length, "tracks");

        if (!hasShownConnectedToastRef.current) {
          hasShownConnectedToastRef.current = true;
          toast.success("You are now connected with your peer.");
        }
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
          hasShownConnectedToastRef.current = false;
        } else if (connectionState === "connected") {
          actionsRef.current.setConnectionStatus("connected");
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        if (iceConnectionState === "failed" || iceConnectionState === "disconnected") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
        }
      },
    }),
    [socketSignaling]
  );

  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => { },

      onDisconnect: () => {
        actionsRef.current.setConnectionStatus("peer-disconnected");
      },

      onConnectError: () => {
        actionsRef.current.setError("Failed to connect to server. Please refresh the page.");
        toast.error("Failed to connect. Please refresh the page.");
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
        logger.done("Joined queue:", data);
        actionsRef.current.setConnectionStatus("searching");
      },

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean }) => {
        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("connecting");
        toast.success("Peer matched! Connecting to peer...");

        const localStream = mediaStream.getStream();
        if (!localStream) {
          logger.error("No local stream available for match");
          return;
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks);

        if (data.isOfferer) {
          try {
            logger.info("Creating offer as offerer...");
            const offer = await peerConnection.createOffer();
            socketSignaling.sendSignal({
              type: "offer",
              sdp: offer,
            });
            logger.done("Offer created and sent to peer");
          } catch (err) {
            logger.error("Error creating offer:", err);
            actionsRef.current.setError("Failed to establish connection. Please try again.");
            actionsRef.current.setConnectionStatus("peer-disconnected");
          }
        } else {
          logger.load("Waiting for offer from peer as answerer...");
        }
      },

      onSignal: async (data: SignalData) => {
        if (!peerConnection.isConnectionValid()) {
          logger.warn("Signal received but peer connection not ready");
          return;
        }

        try {
          if (data.type === "offer") {
            logger.info("Received offer, creating answer...");
            const answer = await peerConnection.handleOffer(data.sdp as RTCSessionDescriptionInit);
            socketSignaling.sendSignal({
              type: "answer",
              sdp: answer,
            });
            logger.done("Answer created and sent to peer");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "answer") {
            logger.info("Received answer, setting remote description...");
            await peerConnection.handleAnswer(data.sdp as RTCSessionDescriptionInit);
            logger.done("Remote description set successfully");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "ice-candidate" && data.candidate) {
            logger.info("Received ICE candidate, adding...");
            await peerConnection.addIceCandidate(data.candidate);
          }
        } catch (err) {
          if (peerConnection.isConnectionValid()) {
            logger.error("Error handling signal:", err);
            actionsRef.current.setError("Failed to process connection signal. Please try again.");
          } else {
            logger.warn("Signal processing error but connection is closed, ignoring:", err);
          }
        }
      },

      onPeerLeft: (data: { message: string; queueSize?: number }) => {
        peerConnection.closePeer();
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);

        if (data.queueSize !== undefined) {
          actionsRef.current.setConnectionStatus("searching");
          actionsRef.current.setError(null);
          toast(`Peer disconnected - ${data.message}`);
        } else {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          toast.error(`Peer disconnected - ${data.message}`);
        }
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
        logger.info("Skipped:", data.message, "Queue size:", data.queueSize);
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
      },

      onEndCall: (data: { message: string }) => {
        logger.info("End call received from peer:", data.message);
        toast(`Call ended - ${data.message}`);
        resetPeerState();
      },

      onChatMessage: (data: { message: string; timestamp: number; senderId: string; senderName?: string; senderImageUrl?: string }) => {
        const socketId = socketSignaling.getSocketId();
        const newMessage: ChatMessage = {
          id: `${data.senderId}-${data.timestamp}`,
          message: data.message,
          timestamp: data.timestamp,
          senderId: data.senderId,
          senderName: data.senderName,
          senderImageUrl: data.senderImageUrl,
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

  const start = useCallback(async () => {
    try {
      actionsRef.current.setError(null);
      actionsRef.current.setConnectionStatus("searching");

      if (!isLoaded) {
        actionsRef.current.setError("Authentication not ready. Please wait...");
        return;
      }

      const token = await getToken();
      if (!token) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await fetchIceServers(token);
      }

      const stream = await mediaStream.acquireMedia();
      actionsRef.current.setLocalStream(stream);

      peerConnection.initializePeerConnection(stream, peerCallbacks);

      await socketSignaling.initializeSocket(socketCallbacks, token);

      socketSignaling.joinQueue();
    } catch (err) {
      logger.error("Error starting video chat:", err);
      actionsRef.current.setError(err instanceof Error ? err.message : "Failed to start video chat");
      actionsRef.current.setConnectionStatus("idle");
      cleanup();
    }
  }, [
    isLoaded,
    getToken,
    mediaStream,
    peerConnection,
    peerCallbacks,
    socketSignaling,
    socketCallbacks,
    cleanup,
  ]);

  const skip = useCallback(() => {
    peerConnection.closePeer();
    actionsRef.current.setRemoteStream(null);
    actionsRef.current.clearChatMessages();
    actionsRef.current.setRemoteMuted(false);
    socketSignaling.skipPeer();
  }, [peerConnection, socketSignaling]);

  const toggleMute = useCallback(() => {
    const newMutedState = mediaStream.toggleMute();
    actionsRef.current.setMuted(newMutedState);
    socketSignaling.sendMuteToggle(newMutedState);
  }, [mediaStream, socketSignaling]);

  const toggleVideo = useCallback(() => {
    const newVideoOffState = mediaStream.toggleVideo();
    actionsRef.current.setVideoOff(newVideoOffState);
  }, [mediaStream]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      const timestamp = Date.now();
      const socketId = socketSignaling.getSocketId();

      const newMessage: ChatMessage = {
        id: `${socketId}-${timestamp}`,
        message: message.trim(),
        timestamp,
        senderId: socketId || "unknown",
        senderName: user?.firstName || user?.username || "You",
        senderImageUrl: user?.imageUrl,
        isOwn: true,
      };
      actionsRef.current.addChatMessage(newMessage);

      socketSignaling.sendChatMessage(message.trim(), timestamp);
    },
    [socketSignaling, user]
  );

  const endCall = useCallback(() => {
    socketSignaling.sendEndCall();
    toast("Call ended - You have ended the call.");
    resetPeerState();
  }, [socketSignaling, resetPeerState]);

  const clearError = useCallback(() => {
    actionsRef.current.setError(null);
  }, []);

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
    clearError,
  };
}

export type { ConnectionStatus, ChatMessage };
