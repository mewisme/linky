"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "@repo/ui/components/ui/sonner";
import { useAuth, useUser } from "@clerk/nextjs";
import type { SignalData } from "@/lib/socket/socket";
import type { UsersAPI } from "@/types/users.types";
import { logger } from "@/utils/logger";

import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useSocketSignaling } from "../socket/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";
import { recoveryController } from "@/lib/webrtc/webrtc-recovery";
import { iceServerCache } from "@/lib/webrtc/ice-servers-cache";
import { useUnloadEndCall } from "./use-unload-end-call";
import { useUserContext } from "@/components/providers/user";
import { useSocket } from "../socket/use-socket";

export interface UseVideoChatReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  chatMessages: ChatMessage[];
  peerInfo: UsersAPI.PublicUserInfo | null;
  sendMessage: (message: string) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  error: string | null;
  clearError: () => void;
}

export function useVideoChat(): UseVideoChatReturn {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const {
    store: { userSettings },
  } = useUserContext();
  const { isHealthy: isSocketHealthy } = useSocket();

  const { state, actions } = useVideoChatState();
  const iceServersRef = useRef<RTCIceServer[]>([]);
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

      try {
        const servers = await iceServerCache.getIceServers(
          async () => await getToken({ template: 'custom', skipCache: true }),
          "forced"
        );
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

  const resetPeerState = useCallback(() => {
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    isOffererRef.current = false;
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
    actionsRef.current.setMuted(false);
    actionsRef.current.setVideoOff(false);
  }, [mediaStream, peerConnection]);

  const resetRuntimeState = useCallback(() => {
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    isOffererRef.current = false;
    actionsRef.current.resetRuntimeState();
    hasShownConnectedToastRef.current = false;
    if (reconnectToastIdRef.current !== null) {
      toast.dismiss(reconnectToastIdRef.current);
      reconnectToastIdRef.current = null;
    }
    isReconnectingRef.current = false;
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

    if (!iceServerCache.isExpired()) {
      return;
    }

    const isInActiveCall = state.connectionStatus === "connected" || state.connectionStatus === "connecting";

    try {
      logger.info("[IceServerCache] Refreshing TURN credentials before expiration");
      const newServers = await iceServerCache.getIceServers(
        async () => await getToken({ template: 'custom', skipCache: true }),
        "expired"
      );

      if (newServers.length === 0) {
        logger.warn("[IceServerCache] Failed to fetch new TURN credentials");
        return;
      }

      await peerConnection.updateIceServers(newServers);
      iceServersRef.current = newServers;

      if (isInActiveCall && isOffererRef.current) {
        if (!iceServerCache.recordIceRestart()) {
          logger.warn("[IceServerCache] ICE restart limit exceeded, skipping restart after credential refresh");
          return;
        }

        logger.info("[IceServerCache] TURN credentials refreshed during active call, initiating ICE restart");
        try {
          const restartOffer = await peerConnection.restartIce();
          socketSignaling.sendSignal({
            type: "offer",
            sdp: restartOffer,
            iceRestart: true,
          });
          logger.info("[IceServerCache] ICE restart offer sent after TURN credential refresh");
        } catch (err) {
          logger.error("[IceServerCache] Failed to initiate ICE restart after credential refresh:", err);
        }
      } else {
        logger.info("[IceServerCache] TURN credentials refreshed successfully");
      }
    } catch (err) {
      logger.error("[IceServerCache] Error refreshing TURN credentials:", err);
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
  const reconnectToastIdRef = useRef<string | number | null>(null);
  const isReconnectingRef = useRef(false);

  const startReconnecting = useCallback(() => {
    const isInCall = state.connectionStatus === "connected" || state.connectionStatus === "reconnecting";
    if (!isInCall || isReconnectingRef.current) {
      return;
    }

    isReconnectingRef.current = true;
    reconnectToastIdRef.current = toast.loading("Reconnecting...");
    logger.info("[ReconnectUX] Reconnecting toast shown");
  }, [state.connectionStatus]);

  const completeReconnection = useCallback(() => {
    if (!isReconnectingRef.current) {
      return;
    }

    if (reconnectToastIdRef.current !== null) {
      toast.dismiss(reconnectToastIdRef.current);
      reconnectToastIdRef.current = null;
    }

    toast.success("Reconnected");
    isReconnectingRef.current = false;
    logger.info("[ReconnectUX] Reconnected toast shown");
  }, []);

  useEffect(() => {
    const isInCall = state.connectionStatus === "connected" || state.connectionStatus === "reconnecting";
    if (isInCall && !isSocketHealthy && !isReconnectingRef.current) {
      logger.warn("[SocketHealth] Socket unhealthy during active call");
      startReconnecting();
    }
  }, [isSocketHealthy, state.connectionStatus, startReconnecting]);

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
          recoveryController.stop();
        } else if (connectionState === "connected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("connected");
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
          hasShownConnectedToastRef.current = true;
        } else if (connectionState === "disconnected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier !== "none") {
            actionsRef.current.setConnectionStatus("reconnecting");
          } else {
            actionsRef.current.setConnectionStatus("connecting");
          }
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        logger.info("ICE connection state changed:", iceConnectionState);
        const isInCall = state.connectionStatus === "connected" || state.connectionStatus === "reconnecting";

        if (iceConnectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
          recoveryController.stop();
          if (reconnectToastIdRef.current !== null) {
            toast.dismiss(reconnectToastIdRef.current);
            reconnectToastIdRef.current = null;
          }
          isReconnectingRef.current = false;
        } else if (iceConnectionState === "connected" || iceConnectionState === "completed") {
          recoveryController.markIceRestartComplete();
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("connected");
            if (isReconnectingRef.current) {
              completeReconnection();
            }
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
        } else if (iceConnectionState === "disconnected" || iceConnectionState === "checking") {
          if (isInCall) {
            startReconnecting();
          }
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier !== "none") {
            actionsRef.current.setConnectionStatus("reconnecting");
          } else {
            actionsRef.current.setConnectionStatus("connecting");
          }
        }
      },
    }),
    [socketSignaling, startReconnecting, completeReconnection, state.connectionStatus]
  );

  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => {
        const isInCall = state.connectionStatus === "connected" || state.connectionStatus === "reconnecting";
        if (isInCall && isReconnectingRef.current) {
          const pc = peerConnection.getPeerConnection();
          if (pc) {
            const iceState = pc.iceConnectionState;
            if (iceState === "connected" || iceState === "completed") {
              completeReconnection();
            }
          }
        }
      },

      onDisconnect: (reason: string) => {
        logger.warn("[SocketHealth] Socket disconnected:", reason);
        const isInCall = state.connectionStatus === "connected" || state.connectionStatus === "reconnecting";
        if (isInCall) {
          logger.info("[SocketHealth] Disconnect during active call - will resync on reconnect");
          startReconnecting();
        }
        actionsRef.current.setConnectionStatus("peer-disconnected");
      },

      onBackendRestart: () => {
        logger.warn("[BackendRestart] Resetting runtime state due to backend restart");
        resetRuntimeState();
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

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => {
        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("connecting");
        actionsRef.current.setPeerInfo(data.peerInfo);
        toast.success("Peer matched! Connecting to peer...");

        const localStream = mediaStream.getStream();
        if (!localStream) {
          logger.error("No local stream available for match");
          return;
        }

        if (iceServersRef.current.length === 0) {
          try {
            iceServersRef.current = await iceServerCache.getIceServers(
              async () => await getToken({ template: 'custom', skipCache: true }),
              "initial"
            );
          } catch (err) {
            logger.error("ICE servers not available for match:", err);
            actionsRef.current.setError("Connection configuration not ready. Please try again.");
            return;
          }
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks);
        isOffererRef.current = data.isOfferer;

        const pc = peerConnection.getPeerConnection();
        if (pc) {
          recoveryController.start({
            pc,
            isOfferer: data.isOfferer,
            onIceRestart: async (offer, useRelay) => {
              if (!socketSignaling.isSocketHealthy()) {
                logger.warn("[Recovery] Socket unhealthy, waiting for recovery before ICE restart");
                await new Promise<void>((resolve) => {
                  const checkInterval = setInterval(() => {
                    if (socketSignaling.isSocketHealthy() || !socketSignaling.getSocket()?.connected) {
                      clearInterval(checkInterval);
                      resolve();
                    }
                  }, 500);
                  setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                  }, 5000);
                });
              }

              if (socketSignaling.isSocketHealthy() && socketSignaling.getSocket()?.connected) {
                socketSignaling.sendSignal({
                  type: "offer",
                  sdp: offer,
                  iceRestart: true,
                });
                logger.info(`[Recovery] ICE restart offer sent (relay: ${useRelay})`);
              } else {
                logger.error("[Recovery] Cannot send ICE restart - socket not healthy");
                throw new Error("Socket not healthy for ICE restart");
              }
            },
            getIceServers: async () => {
              const cached = iceServerCache.getCachedServers();
              if (cached && !iceServerCache.isExpired()) {
                logger.info("[IceServerCache] Reusing cached ICE servers for ICE restart");
                return cached;
              }

              logger.info("[IceServerCache] Fetching ICE servers for ICE restart (cache expired)");
              return await iceServerCache.getIceServers(
                async () => await getToken({ template: 'custom', skipCache: true }),
                "expired"
              );
            },
            recordIceRestart: () => {
              return iceServerCache.recordIceRestart();
            },
            onRecoveryStateChange: (tier) => {
              if (tier === "none") {
                const pcState = pc.connectionState;
                const iceState = pc.iceConnectionState;
                if (pcState === "connected" && (iceState === "connected" || iceState === "completed")) {
                  actionsRef.current.setConnectionStatus("connected");
                } else {
                  actionsRef.current.setConnectionStatus("connecting");
                }
              } else {
                actionsRef.current.setConnectionStatus("reconnecting");
              }
            },
          });
        }

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
            recoveryController.stop();
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
            if (data.iceRestart) {
              recoveryController.markIceRestartComplete();
            }
            const currentTier = recoveryController.getCurrentTier();
            if (currentTier === "none") {
              actionsRef.current.setConnectionStatus("connecting");
            } else {
              actionsRef.current.setConnectionStatus("reconnecting");
            }
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
        recoveryController.stop();
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
        recoveryController.stop();
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
        recoveryController.stop();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
      },

      onEndCall: (data: { message: string }) => {
        logger.info("End call received from peer:", data.message);
        recoveryController.stop();
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

      onFavoriteAdded: (data: { from_user_id: string; from_user_name: string }) => {
        toast.success(`${data.from_user_name} added you to favorites ❤️`);
      },

      onFavoriteAddedSelf: () => {
      },

      onFavoriteRemoved: (data: { from_user_id: string; from_user_name: string }) => {
        toast(`${data.from_user_name} removed you from favorites`);
      },

      onFavoriteRemovedSelf: () => {
      },
    }),
    [mediaStream, peerConnection, peerCallbacks, socketSignaling, resetPeerState, resetRuntimeState, state.connectionStatus, startReconnecting, completeReconnection]
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
        iceServersRef.current = await iceServerCache.getIceServers(
          async () => await getToken({ template: 'custom', skipCache: true }),
          "initial"
        );
      }

      if (iceServersRef.current.length === 0) {
        throw new Error("Failed to obtain ICE servers");
      }

      const initialMuted = userSettings?.default_mute_mic ?? false;
      const initialVideoOff = userSettings?.default_disable_camera ?? false;

      actionsRef.current.setMuted(initialMuted);
      actionsRef.current.setVideoOff(initialVideoOff);

      const stream = await mediaStream.acquireMedia(initialMuted, initialVideoOff);
      actionsRef.current.setLocalStream(stream);

      peerConnection.initializePeerConnection(stream, peerCallbacks);

      await socketSignaling.initializeSocket(socketCallbacks);

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
    userSettings,
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
    recoveryController.stop();
    socketSignaling.sendEndCall();
    toast("Call ended - You have ended the call.");
    resetPeerState();
  }, [socketSignaling, resetPeerState]);

  const clearError = useCallback(() => {
    actionsRef.current.setError(null);
  }, []);

  useUnloadEndCall(
    () => socketSignaling.isInActiveCallRef.current,
    () => socketSignaling.sendEndCall(),
    socketSignaling.getSocketId(),
    socketSignaling.socketRef
  );

  return {
    localStream: state.localStream,
    remoteStream: state.remoteStream,
    connectionStatus: state.connectionStatus,
    isMuted: state.isMuted,
    isVideoOff: state.isVideoOff,
    remoteMuted: state.remoteMuted,
    chatMessages: state.chatMessages,
    peerInfo: state.peerInfo,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    sendFavoriteNotification: socketSignaling.sendFavoriteNotification,
    error: state.error,
    clearError,
  };
}

export type { ConnectionStatus, ChatMessage };
