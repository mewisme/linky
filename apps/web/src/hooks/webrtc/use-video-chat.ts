"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/components/ui/sonner";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

import type { UsersAPI } from "@/types/users.types";
import type { SignalData } from "@/lib/socket/socket";

import { useUserContext } from "@/components/providers/user/user-provider";
import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useScreenShare } from "./use-screen-share";
import { useSocketSignaling } from "../socket/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";
import { useVideoChatStore } from "@/stores/video-chat-store";
import { useUnloadEndCall } from "./use-unload-end-call";
import { useSocket } from "../socket/use-socket";
import { useWebRTCMonitoring } from "./use-webrtc-monitoring";

import { iceServerCache } from "@/lib/webrtc/ice-servers-cache";
import { recoveryController } from "@/lib/webrtc/webrtc-recovery";

export interface UseVideoChatReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  callStartedAt: number | null;
  isInActiveCall: boolean;
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
  toggleScreenShare: () => Promise<void>;
  isSharingScreen: boolean;
  isPeerSharingScreen: boolean;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  error: string | null;
  clearError: () => void;
}

export function useVideoChat(): UseVideoChatReturn {
  const {
    state: { getToken },
    user: { user },
    store: { userSettings },
    authReady,
    authLoading
  } = useUserContext();
  const { isHealthy: isSocketHealthy } = useSocket();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { state, actions } = useVideoChatState();

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();
  const socketSignaling = useSocketSignaling();
  const screenShare = useScreenShare();
  const monitoring = useWebRTCMonitoring();
  const isSharingScreen = useVideoChatStore((s) => s.isSharingScreen);
  const isPeerSharingScreen = useVideoChatStore((s) => s.isPeerSharingScreen);

  const refreshUserProgress = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-progress"] });
  }, [queryClient]);

  const peerConnection = usePeerConnection([]);

  const iceServersRef = useRef<RTCIceServer[]>([]);
  const turnCredentialRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOffererRef = useRef<boolean>(false);

  const hasShownConnectedToastRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const connectionStatusRef = useRef(state.connectionStatus);
  connectionStatusRef.current = state.connectionStatus;

  const isInActiveCall = useMemo(() => {
    return (
      state.callStartedAt !== null &&
      (state.connectionStatus === "matched" ||
        state.connectionStatus === "in_call" ||
        state.connectionStatus === "reconnecting")
    );
  }, [state.callStartedAt, state.connectionStatus]);

  useEffect(() => {
    let mounted = true;

    async function initIceServers() {
      if (!authReady) return;

      try {
        const servers = await iceServerCache.getIceServers(getToken, "forced");
        if (mounted) {
          iceServersRef.current = servers;
        }
      } catch (err) {
        console.error("Failed to fetch ICE servers:", err);
        if (mounted && authReady) {
          actionsRef.current.setError("Failed to initialize connection. Please refresh the page.");
        }
      }
    }

    initIceServers();

    return () => {
      mounted = false;
    };
  }, [authReady, getToken]);

  const refreshTurnCredentials = useCallback(async () => {
    const pc = peerConnection.getPeerConnection();
    if (!pc || pc.signalingState === "closed") {
      return;
    }

    if (!iceServerCache.isExpired()) {
      return;
    }

    const isInActiveCall =
      state.connectionStatus === "matched" ||
      state.connectionStatus === "in_call" ||
      state.connectionStatus === "reconnecting";

    try {
      const newServers = await iceServerCache.getIceServers(
        async () => await getToken(),
        "expired"
      );

      if (newServers.length === 0) {
        return;
      }

      await peerConnection.updateIceServers(newServers);
      iceServersRef.current = newServers;

      if (isInActiveCall && isOffererRef.current) {
        if (!iceServerCache.recordIceRestart()) {
          return;
        }

        try {
          const restartOffer = await peerConnection.restartIce();
          socketSignaling.sendSignal({
            type: "offer",
            sdp: restartOffer,
            iceRestart: true,
          });
        } catch (err) {
          console.error("[IceServerCache] Failed to initiate ICE restart after credential refresh:", err);
        }
      }
    } catch (err) {
      console.error("[IceServerCache] Error refreshing TURN credentials:", err);
    }
  }, [getToken, peerConnection, state.connectionStatus, socketSignaling]);

  useEffect(() => {
    if (!authReady) return;

    const checkAndRefreshCredentials = () => {
      const pc = peerConnection.getPeerConnection();
      if (
        pc &&
        pc.signalingState !== "closed" &&
        (state.connectionStatus === "in_call" || state.connectionStatus === "reconnecting")
      ) {
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
  }, [authReady, peerConnection, state.connectionStatus, refreshTurnCredentials]);

  const startReconnecting = useCallback(() => {
    const currentStatus = connectionStatusRef.current;
    const isInCall =
      currentStatus === "matched" ||
      currentStatus === "in_call" ||
      currentStatus === "reconnecting";
    if (!isInCall || isReconnectingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ReconnectUX] startReconnecting skipped", {
          isInCall,
          isReconnecting: isReconnectingRef.current,
          connectionStatus: currentStatus,
        });
      }
      return;
    }

    isReconnectingRef.current = true;
    console.info("[ReconnectUX] Reconnecting toast shown");
    if (process.env.NODE_ENV === "development") {
      console.log("[ReconnectUX] startReconnecting triggered", {
        connectionStatus: currentStatus,
      });
    }
  }, []);

  const completeReconnection = useCallback(() => {
    if (!isReconnectingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ReconnectUX] completeReconnection skipped - not reconnecting");
      }
      return;
    }

    toast.success("Reconnected");
    isReconnectingRef.current = false;
    console.info("[ReconnectUX] Reconnected toast shown");
    if (process.env.NODE_ENV === "development") {
      console.log("[ReconnectUX] completeReconnection - showing reconnected toast");
    }
  }, []);

  useEffect(() => {
    const currentStatus = connectionStatusRef.current;
    const isInCall =
      currentStatus === "matched" ||
      currentStatus === "in_call" ||
      currentStatus === "reconnecting";
    if (isInCall && !isSocketHealthy && !isReconnectingRef.current) {
      console.warn("[SocketHealth] Socket unhealthy during active call");
      startReconnecting();
    }
  }, [isSocketHealthy, startReconnecting]);

  const resetPeerState = useCallback(() => {
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
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
    actionsRef.current.resetRuntimeState();
  }, [mediaStream, peerConnection]);

  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  const initializeConnectionRef = useCallback((
    peerCallbacks: {
      onTrack: (stream: MediaStream) => void;
      onIceCandidate: (candidate: RTCIceCandidate) => void;
      onConnectionStateChange: (connectionState: RTCPeerConnectionState) => void;
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => void;
    },
    socketCallbacks: Record<string, (...args: unknown[]) => void>
  ) => {
    return async (stream: MediaStream) => {
      peerConnection.initializePeerConnection(stream, peerCallbacks, iceServersRef.current);
      await socketSignaling.initializeSocket(socketCallbacks as never);
      socketSignaling.joinQueue();
    };
  }, [peerConnection, socketSignaling]);

  const peerCallbacks = useMemo(
    () => ({
      onTrack: (stream: MediaStream) => {
        actionsRef.current.setRemoteStream(stream);
        actionsRef.current.setConnectionStatus("in_call");

        if (process.env.NODE_ENV === "development") {
          console.log("[VideoChatState] onTrack - remote track received", {
            isReconnecting: isReconnectingRef.current,
            hasShownToast: hasShownConnectedToastRef.current,
            connectionStatus: "in_call",
          });
        }

        if (!hasShownConnectedToastRef.current && !isReconnectingRef.current) {
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
        if (peerConnection.getIceRestartInProgress?.() && (connectionState === "disconnected" || connectionState === "connecting")) {
          return;
        }
        if (connectionState === "failed") {
          actionsRef.current.setConnectionStatus("reconnecting");
          hasShownConnectedToastRef.current = false;
          recoveryController.stop();
        } else if (connectionState === "connected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("in_call");
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
          hasShownConnectedToastRef.current = true;
        } else if (connectionState === "disconnected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier !== "none") {
            actionsRef.current.setConnectionStatus("reconnecting");
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        if (peerConnection.getIceRestartInProgress?.() && (iceConnectionState === "checking" || iceConnectionState === "disconnected")) {
          return;
        }
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";

        if (iceConnectionState === "failed") {
          actionsRef.current.setConnectionStatus("reconnecting");
          hasShownConnectedToastRef.current = false;
          recoveryController.stop();
          isReconnectingRef.current = false;
        } else if (iceConnectionState === "connected" || iceConnectionState === "completed") {
          peerConnection.setIceRestartInProgress?.(false);
          recoveryController.markIceRestartComplete();
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("in_call");
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
            actionsRef.current.setConnectionStatus("reconnecting");
          }
        }
      },
    }),
    [socketSignaling, startReconnecting, completeReconnection, peerConnection]
  );

  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => {
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";
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
        console.warn("[SocketHealth] Socket disconnected:", reason);
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";
        if (isInCall) {
          startReconnecting();
          actionsRef.current.setConnectionStatus("reconnecting");
        }
      },

      onBackendRestart: () => {
        console.warn("[BackendRestart] Resetting runtime state due to backend restart");
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";
        if (isInCall) {
          actionsRef.current.setConnectionStatus("reconnecting");
        }
        resetRuntimeState();
      },

      onConnectError: () => {
        actionsRef.current.setError("Failed to connect to server. Please refresh the page.");
        toast.error("Failed to connect. Please refresh the page.");
      },

      onJoinedQueue: (data: { message: string; queueSize: number }) => {
        actionsRef.current.setConnectionStatus("searching");
      },

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[VideoChatState] onMatched - resetting reconnect flags", {
            wasReconnecting: isReconnectingRef.current,
            hadShownToast: hasShownConnectedToastRef.current,
            previousStatus: state.connectionStatus,
          });
        }
        isReconnectingRef.current = false;
        hasShownConnectedToastRef.current = false;

        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("in_call");
        actionsRef.current.setPeerInfo(data.peerInfo);
        actionsRef.current.setRemoteCameraEnabled(true);
        if (useVideoChatStore.getState().callStartedAt === null) {
          actionsRef.current.setCallStartedAt(Date.now());
        }

        const localStream = mediaStream.getStream();
        if (!localStream) {
          console.error("No local stream available for match");
          return;
        }

        if (iceServersRef.current.length === 0) {
          try {
            iceServersRef.current = await iceServerCache.getIceServers(
              async () => await getToken(),
              "initial"
            );
          } catch (err) {
            console.error("ICE servers not available for match:", err);
            actionsRef.current.setError("Connection configuration not ready. Please try again.");
            return;
          }
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks, iceServersRef.current);
        isOffererRef.current = data.isOfferer;

        const pc = peerConnection.getPeerConnection();
        if (pc) {
          monitoring.initializeMonitoring(pc, isMobile, {
            onNetworkQualityChange: (quality) => {
              actionsRef.current.setNetworkQuality(quality);
            },
            onVideoStalled: (stalled) => {
              actionsRef.current.setVideoStalled(stalled);
            },
            onQualityTierChange: (tier) => {
              actionsRef.current.setQualityTier(tier);
            },
          });

          recoveryController.start({
            pc,
            isOfferer: data.isOfferer,
            onIceRestart: async (offer, useRelay) => {
              peerConnection.setIceRestartInProgress?.(true);
              if (!socketSignaling.isSocketHealthy()) {
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
              } else {
                throw new Error("Socket not healthy for ICE restart");
              }
            },
            getIceServers: async () => {
              const cached = iceServerCache.getCachedServers();
              if (cached && !iceServerCache.isExpired()) {
                return cached;
              }

              return await iceServerCache.getIceServers(
                getToken,
                "expired"
              );
            },
            recordIceRestart: () => {
              return iceServerCache.recordIceRestart();
            },
            onRecoveryStateChange: (tier) => {
              if (tier === "none") {
                if (peerConnection.getIceRestartInProgress?.()) {
                  return;
                }
                const pcState = pc.connectionState;
                const iceState = pc.iceConnectionState;
                if (pcState === "connected" && (iceState === "connected" || iceState === "completed")) {
                  actionsRef.current.setConnectionStatus("in_call");
                } else {
                  actionsRef.current.setConnectionStatus("reconnecting");
                }
              } else {
                actionsRef.current.setConnectionStatus("reconnecting");
              }
            },
          });
        }

        if (data.isOfferer) {
          try {
            const offer = await peerConnection.createOffer();
            socketSignaling.sendSignal({
              type: "offer",
              sdp: offer,
            });
          } catch (err) {
            console.error("Error creating offer:", err);
            actionsRef.current.setError("Failed to establish connection. Please try again.");
            actionsRef.current.setConnectionStatus("ended");
            recoveryController.stop();
          }
        }
      },

      onSignal: async (data: SignalData) => {
        const pc = peerConnection.getPeerConnection();
        if (!pc || pc.signalingState === "closed") {
          return;
        }

        try {
          if (data.type === "offer") {
            const isIceRestart = data.iceRestart === true;
            const answer = await peerConnection.handleOffer(data.sdp as RTCSessionDescriptionInit, isIceRestart);
            socketSignaling.sendSignal({
              type: "answer",
              sdp: answer,
              iceRestart: isIceRestart,
            });
            if (!isIceRestart) {
              actionsRef.current.setConnectionStatus("in_call");
            }
          } else if (data.type === "answer") {
            await peerConnection.handleAnswer(data.sdp as RTCSessionDescriptionInit, data.iceRestart);
            if (data.iceRestart) {
              recoveryController.markIceRestartComplete();
            } else {
              const currentTier = recoveryController.getCurrentTier();
              if (currentTier === "none") {
                actionsRef.current.setConnectionStatus("in_call");
              } else {
                actionsRef.current.setConnectionStatus("reconnecting");
              }
            }
          } else if (data.type === "ice-candidate" && data.candidate) {
            await peerConnection.addIceCandidate(data.candidate);
          }
        } catch (err) {
          const currentPc = peerConnection.getPeerConnection();
          if (currentPc && currentPc.signalingState !== "closed") {
            console.error("Error handling signal:", err);
            actionsRef.current.setError("Failed to process connection signal. Please try again.");
          }
        }
      },

      onPeerLeft: (data: { message: string; queueSize?: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setConnectionStatus("ended");

        if (data.queueSize !== undefined) {
          actionsRef.current.setError(null);
          toast(`Peer disconnected - ${data.message}`);
        } else {
          toast.error(`Peer disconnected - ${data.message}`);
        }
      },

      onPeerSkipped: (data: { message: string; queueSize: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setError(null);
        toast(`Peer skipped - ${data.message}`);
        refreshUserProgress();
      },

      onSkipped: (data: { message: string; queueSize: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        refreshUserProgress();
      },

      onEndCall: (data: { message: string }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        toast(`Call ended - ${data.message}`);
        isOffererRef.current = false;
        actionsRef.current.setConnectionStatus("ended");
        actionsRef.current.setCallStartedAt(null);
        resetPeerState();
        refreshUserProgress();
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

      onVideoToggle: (data: { videoOff: boolean }) => {
        actionsRef.current.setRemoteCameraEnabled(!data.videoOff);
      },

      onScreenShareToggle: (data: { sharing: boolean; streamId?: string }) => {
        actionsRef.current.setPeerSharingScreen(data.sharing);
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
    [
      mediaStream,
      peerConnection,
      peerCallbacks,
      socketSignaling,
      resetPeerState,
      resetRuntimeState,
      startReconnecting,
      completeReconnection,
      refreshUserProgress,
      getToken,
      monitoring,
      isMobile,
      state.connectionStatus,
    ]
  );

  const start = useCallback(async () => {
    try {
      actionsRef.current.setError(null);

      if (authLoading) {
        return;
      }

      if (!authReady) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      const token = await getToken();
      if (!token) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      actionsRef.current.setConnectionStatus("searching");

      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await iceServerCache.getIceServers(
          getToken,
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

      const initialize = initializeConnectionRef(peerCallbacks, socketCallbacks as Record<string, (...args: unknown[]) => void>);
      await initialize(stream);
    } catch (err) {
      console.error("Error starting video chat:", err);
      actionsRef.current.setError(err instanceof Error ? err.message : "Failed to start video chat");
      actionsRef.current.setConnectionStatus("idle");
      cleanup();
    }
  }, [
    getToken,
    userSettings,
    mediaStream,
    cleanup,
    authReady,
    authLoading,
    initializeConnectionRef,
    peerCallbacks,
    socketCallbacks,
  ]);

  const skip = useCallback(() => {
    peerConnection.closePeer();
    actionsRef.current.setRemoteStream(null);
    actionsRef.current.clearChatMessages();
    actionsRef.current.setRemoteMuted(false);
    actionsRef.current.setCallStartedAt(null);
    actionsRef.current.setConnectionStatus("searching");
    socketSignaling.skipPeer();
    setTimeout(() => refreshUserProgress(), 400);
  }, [peerConnection, socketSignaling, refreshUserProgress]);

  const endCall = useCallback(() => {
    recoveryController.stop();
    socketSignaling.sendEndCall();
    toast("Call ended - You have ended the call.");
    actionsRef.current.setConnectionStatus("ended");
    actionsRef.current.setCallStartedAt(null);
    resetPeerState();
    setTimeout(() => refreshUserProgress(), 400);
  }, [socketSignaling, resetPeerState, refreshUserProgress]);

  const toggleMute = useCallback(() => {
    const newMutedState = mediaStream.toggleMute();
    actionsRef.current.setMuted(newMutedState);
    socketSignaling.sendMuteToggle(newMutedState);
  }, [mediaStream, socketSignaling]);

  const toggleVideo = useCallback(() => {
    const newVideoOffState = mediaStream.toggleVideo();
    actionsRef.current.setVideoOff(newVideoOffState);
    socketSignaling.sendVideoToggle(newVideoOffState);
  }, [mediaStream, socketSignaling]);

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

  const clearError = useCallback(() => {
    actionsRef.current.setError(null);
  }, []);

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      screenShare.stopScreenShare();
      actionsRef.current.setSharingScreen(false);
      actionsRef.current.setScreenStream(null);
      socketSignaling.sendScreenShareToggle(false);

      const localStream = mediaStream.getStream();
      if (localStream) {
        const cameraTrack = localStream.getVideoTracks()[0];
        if (cameraTrack) {
          await peerConnection.replaceVideoTrack(cameraTrack);
        }
      }
    } else {
      try {
        const stream = await screenShare.startScreenShare();
        const screenTrack = stream.getVideoTracks()[0];

        if (screenTrack) {
          screenTrack.addEventListener("ended", () => {
            actionsRef.current.setSharingScreen(false);
            actionsRef.current.setScreenStream(null);
            socketSignaling.sendScreenShareToggle(false);

            const localStream = mediaStream.getStream();
            if (localStream) {
              const cameraTrack = localStream.getVideoTracks()[0];
              if (cameraTrack) {
                void peerConnection.replaceVideoTrack(cameraTrack);
              }
            }
          });

          await peerConnection.replaceVideoTrack(screenTrack);
          actionsRef.current.setSharingScreen(true);
          actionsRef.current.setScreenStream(stream);
          socketSignaling.sendScreenShareToggle(true, stream.id);
        }
      } catch (error) {
        actionsRef.current.setSharingScreen(false);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage !== "Screen sharing cancelled or failed") {
          toast.error("Failed to start screen sharing. Please try again.");
        }
      }
    }
  };

  useUnloadEndCall(
    isInActiveCall,
    () => socketSignaling.isInActiveCallRef.current,
    () => socketSignaling.sendEndCall(),
    socketSignaling.getSocketId(),
    socketSignaling.socketRef
  );

  return {
    localStream: state.localStream,
    remoteStream: state.remoteStream,
    connectionStatus: state.connectionStatus,
    callStartedAt: state.callStartedAt,
    isInActiveCall,
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
    toggleScreenShare,
    isSharingScreen,
    isPeerSharingScreen,
    sendFavoriteNotification: socketSignaling.sendFavoriteNotification,
    error: state.error,
    clearError,
  };
}

export type { ConnectionStatus, ChatMessage };
