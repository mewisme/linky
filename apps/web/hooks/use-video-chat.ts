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
  const iceServersFetchedAtRef = useRef<number>(0);
  const turnCredentialRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOffererRef = useRef<boolean>(false);

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();

  const peerConnection = usePeerConnection(iceServersRef.current);

  const socketSignaling = useSocketSignaling();

  useEffect(() => {
    let mounted = true;

    async function initIceServers() {
      if (!isLoaded) return;

      const token = await getToken({ template: 'custom', skipCache: true });
      if (!token) {
        throw new Error("No token found");
      }

      try {
        const servers = await fetchIceServers(token);
        if (mounted) {
          iceServersRef.current = servers;
          iceServersFetchedAtRef.current = Date.now();
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
        const token = await getToken({ template: 'custom', skipCache: true });
        if (token) {
          socketSignaling.updateSocketToken(token);
        }
      } catch (error) {
        logger.error("Failed to update socket token:", error);
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 300_000);

    return () => {
      clearInterval(interval);
    };
  }, [isLoaded, getToken, socketSignaling]);

  const resetPeerState = useCallback(() => {
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    isOffererRef.current = false;
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
  }, [mediaStream, peerConnection]);

  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  const refreshTurnCredentials = useCallback(async () => {
    const pc = peerConnection.getPeerConnection();
    if (!pc || pc.signalingState === "closed") {
      return;
    }

    const timeSinceFetch = Date.now() - iceServersFetchedAtRef.current;
    const turnCredentialLifetime = 300_000;
    const refreshThreshold = turnCredentialLifetime * 0.8;

    if (timeSinceFetch < refreshThreshold) {
      return;
    }

    const isInActiveCall = state.connectionStatus === "connected" || state.connectionStatus === "connecting";

    try {
      const token = await getToken({ template: 'custom', skipCache: true });
      if (!token) {
        logger.warn("Cannot refresh TURN credentials: no token");
        return;
      }

      logger.info("Refreshing TURN credentials before expiration");
      const newServers = await fetchIceServers(token);

      if (newServers.length === 0) {
        logger.warn("Failed to fetch new TURN credentials");
        return;
      }

      await peerConnection.updateIceServers(newServers);
      iceServersRef.current = newServers;
      iceServersFetchedAtRef.current = Date.now();

      if (isInActiveCall && isOffererRef.current) {
        logger.info("TURN credentials refreshed during active call, initiating ICE restart");
        try {
          const restartOffer = await peerConnection.restartIce();
          socketSignaling.sendSignal({
            type: "offer",
            sdp: restartOffer,
            iceRestart: true,
          });
          logger.info("ICE restart offer sent after TURN credential refresh");
        } catch (err) {
          logger.error("Failed to initiate ICE restart after credential refresh:", err);
        }
      } else {
        logger.info("TURN credentials refreshed successfully");
      }
    } catch (err) {
      logger.error("Error refreshing TURN credentials:", err);
    }
  }, [getToken, peerConnection, state.connectionStatus, socketSignaling]);

  useEffect(() => {
    if (!isLoaded) return;

    const checkAndRefreshCredentials = () => {
      const pc = peerConnection.getPeerConnection();
      if (pc && pc.signalingState !== "closed" && state.connectionStatus === "connected") {
        refreshTurnCredentials();
      }
    };

    turnCredentialRefreshTimerRef.current = setInterval(checkAndRefreshCredentials, 60_000);

    return () => {
      if (turnCredentialRefreshTimerRef.current) {
        clearInterval(turnCredentialRefreshTimerRef.current);
        turnCredentialRefreshTimerRef.current = null;
      }
    };
  }, [isLoaded, peerConnection, state.connectionStatus, refreshTurnCredentials]);

  useEffect(() => {
    return () => {
      cleanup();
      if (turnCredentialRefreshTimerRef.current) {
        clearInterval(turnCredentialRefreshTimerRef.current);
      }
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
        if (connectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
        } else if (connectionState === "connected") {
          actionsRef.current.setConnectionStatus("connected");
          hasShownConnectedToastRef.current = true;
        } else if (connectionState === "disconnected") {
          actionsRef.current.setConnectionStatus("connecting");
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        logger.info("ICE connection state changed:", iceConnectionState);
        if (iceConnectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
        } else if (iceConnectionState === "connected" || iceConnectionState === "completed") {
          actionsRef.current.setConnectionStatus("connected");
        } else if (iceConnectionState === "disconnected" || iceConnectionState === "checking") {
          actionsRef.current.setConnectionStatus("connecting");
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

        if (iceServersRef.current.length === 0) {
          logger.error("ICE servers not available for match");
          actionsRef.current.setError("Connection configuration not ready. Please try again.");
          return;
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks);
        isOffererRef.current = data.isOfferer;

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
        const pc = peerConnection.getPeerConnection();
        if (!pc || pc.signalingState === "closed") {
          logger.warn("Signal received but peer connection not ready or closed");
          return;
        }

        try {
          if (data.type === "offer") {
            const isIceRestart = data.iceRestart === true;
            if (isIceRestart) {
              logger.info("Received ICE restart offer, creating answer...");
            } else {
              logger.info("Received offer, creating answer...");
            }
            const answer = await peerConnection.handleOffer(data.sdp as RTCSessionDescriptionInit, isIceRestart);
            socketSignaling.sendSignal({
              type: "answer",
              sdp: answer,
              iceRestart: isIceRestart,
            });
            logger.done("Answer created and sent to peer");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "answer") {
            logger.info("Received answer, setting remote description...");
            await peerConnection.handleAnswer(data.sdp as RTCSessionDescriptionInit, data.iceRestart);
            logger.done("Remote description set successfully");
            actionsRef.current.setConnectionStatus("connecting");
          } else if (data.type === "ice-candidate" && data.candidate) {
            logger.info("Received ICE candidate, adding...");
            await peerConnection.addIceCandidate(data.candidate);
          }
        } catch (err) {
          const currentPc = peerConnection.getPeerConnection();
          if (currentPc && currentPc.signalingState !== "closed") {
            logger.error("Error handling signal:", err);
            actionsRef.current.setError("Failed to process connection signal. Please try again.");
          } else {
            logger.warn("Signal processing error but connection is closed, ignoring:", err);
          }
        }
      },

      onPeerLeft: (data: { message: string; queueSize?: number }) => {
        peerConnection.closePeer();
        isOffererRef.current = false;
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
        isOffererRef.current = false;
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
        isOffererRef.current = false;
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
      },

      onEndCall: (data: { message: string }) => {
        logger.info("End call received from peer:", data.message);
        toast(`Call ended - ${data.message}`);
        isOffererRef.current = false;
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

      const token = await getToken({ template: 'custom', skipCache: true });
      if (!token) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await fetchIceServers(token);
        iceServersFetchedAtRef.current = Date.now();
      }

      if (iceServersRef.current.length === 0) {
        throw new Error("Failed to obtain ICE servers");
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
