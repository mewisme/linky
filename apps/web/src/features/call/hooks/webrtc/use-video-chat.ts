"use client";

import * as Sentry from "@sentry/nextjs";
import { useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@ws/ui/internal-lib/react-query";
import { toast } from "@ws/ui/components/ui/sonner";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";

import type { UsersAPI } from "@/entities/user/types/users.types";
import type { SignalData } from "@/lib/realtime/socket";
import type {
  ChatMessage,
  ChatMessageDraft,
  ChatErrorPayload,
  ChatMessageInputPayload,
  ChatMessagePayload,
  ChatTypingPayload,
} from "@/features/chat/types/chat-message.types";

import { useUserContext } from "@/providers/user/user-provider";
import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useScreenShare } from "./use-screen-share";
import { useSocketSignaling } from "@/features/realtime/hooks/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus } from "./use-video-chat-state";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useUnloadEndCall } from "./use-unload-end-call";
import { useSocket } from "@/features/realtime/hooks/use-socket";
import { useWebRTCMonitoring } from "./use-webrtc-monitoring";
import { useCallTabCoordination } from "../call-coordination/use-call-tab-coordination";

import { iceServerCache } from "@/features/call/lib/webrtc/ice-servers-cache";
import { recoveryController } from "@/features/call/lib/webrtc/webrtc-recovery";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";

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
  isPeerTyping: boolean;
  peerInfo: UsersAPI.PublicUserInfo | null;
  sendMessage: (draft: ChatMessageDraft) => void;
  sendTyping: (isTyping: boolean) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  swapCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  isSharingScreen: boolean;
  isPeerSharingScreen: boolean;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  error: string | null;
  clearError: () => void;
  isPassive: boolean;
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
  const { play } = useSoundWithSettings();

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

  const tabCoordination = useCallTabCoordination({
    scopeId: user?.id ?? null,
    onOwnershipLost: () => {
      iceRestartCancelRef.current = true;
      monitoring.stopMonitoring();
      recoveryController.stop();
      iceServerCache.resetSession();
      mediaStream.releaseMedia();
      peerConnection.closePeer();
      actionsRef.current.resetPeerState();
      actionsRef.current.setLocalStream(null);
      actionsRef.current.setMuted(false);
      actionsRef.current.setVideoOff(false);
    },
    onSwitchApproved: () => {
      if (state.connectionStatus === "in_call" || state.connectionStatus === "reconnecting") {
        void start();
      }
    },
  });

  const peerConnection = usePeerConnection([]);

  const iceServersRef = useRef<RTCIceServer[]>([]);
  const turnCredentialRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOffererRef = useRef<boolean>(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackEndedHandlerRef = useRef<(() => void) | null>(null);
  const iceRestartCancelRef = useRef(false);

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
    if (!authReady) return;
    let mounted = true;

    async function initIceServers() {
      try {
        const servers = await iceServerCache.getIceServers(
          (opts) => getTokenRef.current(opts),
          "initial"
        );
        if (mounted) {
          iceServersRef.current = servers;
        }
      } catch (err) {
        Sentry.logger.error("Failed to fetch ICE servers", { error: err });
        if (mounted) {
          actionsRef.current.setError("Failed to initialize connection. Please refresh the page.");
        }
      }
    }

    void initIceServers();

    return () => {
      mounted = false;
    };
  }, [authReady]);

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
        (opts) => getTokenRef.current(opts),
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
          Sentry.logger.error("[IceServerCache] Failed to initiate ICE restart after credential refresh", { error: err });
        }
      }
    } catch (err) {
      Sentry.logger.error("[IceServerCache] Error refreshing TURN credentials", { error: err });
    }
  }, [peerConnection, state.connectionStatus, socketSignaling]);

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
      return;
    }

    isReconnectingRef.current = true;
  }, []);

  const completeReconnection = useCallback(() => {
    if (!isReconnectingRef.current) {
      return;
    }

    isReconnectingRef.current = false;
    trackEvent({ name: "call_reconnected" });
  }, []);

  useEffect(() => {
    const currentStatus = connectionStatusRef.current;
    const isInCall =
      currentStatus === "matched" ||
      currentStatus === "in_call" ||
      currentStatus === "reconnecting";
    if (isInCall && !isSocketHealthy && !isReconnectingRef.current) {
      Sentry.logger.warn("[SocketHealth] Socket unhealthy during active call");
      startReconnecting();
    }
  }, [isSocketHealthy, startReconnecting]);

  const removeScreenTrackEndedListener = useCallback(() => {
    const track = screenTrackRef.current;
    const handler = screenTrackEndedHandlerRef.current;
    if (track && handler) {
      track.removeEventListener("ended", handler);
      screenTrackRef.current = null;
      screenTrackEndedHandlerRef.current = null;
    }
  }, []);

  const resetPeerState = useCallback(() => {
    iceRestartCancelRef.current = true;
    removeScreenTrackEndedListener();
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
    actionsRef.current.setMuted(false);
    actionsRef.current.setVideoOff(false);
  }, [mediaStream, peerConnection, removeScreenTrackEndedListener]);

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

        if (!hasShownConnectedToastRef.current && !isReconnectingRef.current) {
          hasShownConnectedToastRef.current = true;
          toast.success("You are now connected with your peer.");
          play('join_call')
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
            if (!hasShownConnectedToastRef.current && !isReconnectingRef.current) {
              hasShownConnectedToastRef.current = true;
              toast.success("You are now connected with your peer.");
              play('join_call');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        if (currentStatus === "searching") {
          socketSignaling.joinQueue();
        } else if (isInCall && isReconnectingRef.current) {
          socketSignaling.requestResync();
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
        Sentry.logger.warn("[SocketHealth] Socket disconnected", { reason });
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";

        if (currentStatus === "searching") {
          const isTransportClose = reason === "transport close" || reason === "transport error";
          if (isTransportClose) {
            actionsRef.current.setConnectionStatus("idle");
            actionsRef.current.setError("Connection lost during matchmaking. Please try again.");
            toast.error("Connection lost. Please try again.");
          }
        } else if (isInCall) {
          startReconnecting();
          actionsRef.current.setConnectionStatus("reconnecting");
        }
      },

      onBackendRestart: () => {
        Sentry.logger.warn("[BackendRestart] Resetting runtime state due to backend restart");
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
      onResyncRequired: () => {
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";
        if (isInCall) {
          startReconnecting();
          actionsRef.current.setConnectionStatus("reconnecting");
          socketSignaling.requestResync();
        }
      },
      onForcedTeardown: () => {
        monitoring.stopMonitoring();
        actionsRef.current.setConnectionStatus("ended");
        resetPeerState();
      },

      onJoinedQueue: (_data: { message: string; queueSize: number }) => {
        actionsRef.current.setConnectionStatus("searching");
        trackEvent({ name: "matchmaking_started" });
      },

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => {
        isReconnectingRef.current = false;
        hasShownConnectedToastRef.current = false;

        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("in_call");
        actionsRef.current.setPeerInfo(data.peerInfo);
        actionsRef.current.setRemoteCameraEnabled(true);
        if (useVideoChatStore.getState().callStartedAt === null) {
          actionsRef.current.setCallStartedAt(Date.now());
          trackEvent({ name: "call_started" });
        }
        trackEvent({ name: "matchmaking_matched" });

        tabCoordination.claimOwnership(data.roomId);

        const localStream = mediaStream.getStream();
        if (!localStream) {
          Sentry.logger.error("No local stream available for match");
          return;
        }

        if (iceServersRef.current.length === 0) {
          try {
            iceServersRef.current = await iceServerCache.getIceServers(
              (opts) => getTokenRef.current(opts),
              "initial"
            );
          } catch (err) {
            Sentry.logger.error("ICE servers not available for match", { error: err });
            actionsRef.current.setError("Connection configuration not ready. Please try again.");
            return;
          }
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks, iceServersRef.current);
        isOffererRef.current = data.isOfferer;
        socketSignaling.sendVideoToggle(useVideoChatStore.getState().isVideoOff);

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
            onIceRestart: async (offer) => {
              peerConnection.setIceRestartInProgress?.(true);
              iceRestartCancelRef.current = false;
              if (!socketSignaling.isSocketHealthy()) {
                await new Promise<void>((resolve) => {
                  let settled = false;
                  const checkInterval = setInterval(() => {
                    if (iceRestartCancelRef.current) {
                      if (!settled) {
                        settled = true;
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        resolve();
                      }
                      return;
                    }
                    if (socketSignaling.isSocketHealthy() || !socketSignaling.getSocket()?.connected) {
                      if (!settled) {
                        settled = true;
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        resolve();
                      }
                    }
                  }, 500);
                  const timeoutId = setTimeout(() => {
                    if (!settled) {
                      settled = true;
                      clearInterval(checkInterval);
                      resolve();
                    }
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
                (opts) => getTokenRef.current(opts),
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
            Sentry.logger.error("Error creating offer", { error: err instanceof Error ? err.message : "Unknown error" });
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
            Sentry.logger.error("Error handling signal", { error: err instanceof Error ? err.message : "Unknown error" });
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
        actionsRef.current.setPeerTyping(false);
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
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setError(null);
        toast(`Peer skipped - ${data.message}`);
        refreshUserProgress();
      },

      onSkipped: (_data: { message: string; queueSize: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.clearChatMessages();
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        refreshUserProgress();
      },

      onEndCall: (data: { message: string }) => {
        const currentStatus = connectionStatusRef.current;
        const isInCall =
          currentStatus === "matched" ||
          currentStatus === "in_call" ||
          currentStatus === "reconnecting";
        if (!isInCall) {
          return;
        }

        monitoring.stopMonitoring();
        recoveryController.stop();
        toast(`Call ended - ${data.message}`);
        play('leave_call')
        isOffererRef.current = false;
        actionsRef.current.setConnectionStatus("ended");
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setPeerTyping(false);
        resetPeerState();
        refreshUserProgress();
      },

      onChatMessage: (data: ChatMessagePayload) => {
        const socketId = socketSignaling.getSocketId();
        const isOwn = data.sender.socketId === socketId;
        const newMessage: ChatMessage = {
          ...data,
          isOwn,
          localStatus: isOwn ? "sent" : undefined,
        };
        actionsRef.current.addChatMessage(newMessage);
        if (!isOwn) {
          actionsRef.current.setPeerTyping(false);
        }
      },

      onChatTyping: (data: ChatTypingPayload) => {
        actionsRef.current.setPeerTyping(!!data.isTyping);
      },

      onChatError: (data: ChatErrorPayload) => {
        toast.error(data.message);
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

      onDequeued: (data: { reason: string }) => {
        const currentStatus = connectionStatusRef.current;
        if (currentStatus === "searching") {
          actionsRef.current.setConnectionStatus("idle");
          if (!data.reason.includes("matched")) {
            toast.error("Removed from matchmaking queue");
          }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const socket = socketSignaling.getSocket();
      if (!socket?.connected) {
        actionsRef.current.setError("Connection not ready. Please wait a moment and try again.");
        toast.error("Connection not ready. Please wait...");
        return;
      }

      const claimed = tabCoordination.claimOwnership(null);
      if (!claimed) {
        actionsRef.current.setError("Another tab owns the call. Please close other tabs or switch the call.");
        toast.error("Call is active in another tab");
        return;
      }

      actionsRef.current.setConnectionStatus("searching");

      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await iceServerCache.getIceServers(
          (opts) => getTokenRef.current(opts),
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

      if (!mediaStream.hasCamera()) {
        actionsRef.current.setVideoOff(true);
      }

      actionsRef.current.setLocalStream(stream);

      const initialize = initializeConnectionRef(peerCallbacks, socketCallbacks as Record<string, (...args: unknown[]) => void>);
      await initialize(stream);
    } catch (err) {
      Sentry.logger.error("Error starting video chat", { error: err instanceof Error ? err.message : "Unknown error" });
      actionsRef.current.setError(err instanceof Error ? err.message : "Failed to start video chat");
      actionsRef.current.setConnectionStatus("idle");
      tabCoordination.releaseOwnership();
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    tabCoordination,
  ]);

  const skip = useCallback(() => {
    peerConnection.closePeer();
    actionsRef.current.setRemoteStream(null);
    actionsRef.current.clearChatMessages();
    actionsRef.current.setRemoteMuted(false);
    actionsRef.current.setCallStartedAt(null);
    actionsRef.current.setConnectionStatus("searching");
    socketSignaling.skipPeer();
    trackEvent({ name: "matchmaking_skipped" });
    setTimeout(() => refreshUserProgress(), 400);
  }, [peerConnection, socketSignaling, refreshUserProgress]);

  const endCall = useCallback(() => {
    monitoring.stopMonitoring();
    recoveryController.stop();
    socketSignaling.sendEndCall();
    trackEvent({ name: "call_ended" });
    toast("Call ended - You have ended the call.");
    actionsRef.current.setConnectionStatus("ended");
    actionsRef.current.setCallStartedAt(null);
    tabCoordination.releaseOwnership();
    resetPeerState();
    setTimeout(() => refreshUserProgress(), 400);
  }, [socketSignaling, resetPeerState, refreshUserProgress, tabCoordination, monitoring]);

  useHotkey(
    "Mod+D",
    (event) => {
      event.preventDefault();
      endCall();
    },
    {
      preventDefault: true,
      enabled:
        state.connectionStatus === "searching" ||
        state.connectionStatus === "matched" ||
        state.connectionStatus === "in_call" ||
        state.connectionStatus === "reconnecting",
    }
  );

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

  const swapCamera = useCallback(async () => {
    const nextTrack = await mediaStream.swapCamera();
    if (!nextTrack) {
      return;
    }

    actionsRef.current.setLocalStream(mediaStream.getStream());

    try {
      await peerConnection.replaceVideoTrack(nextTrack);
    } catch {
      // PeerConnection not ready or no sender yet
    }
  }, [mediaStream, peerConnection]);

  const createMessageId = useCallback(() => {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const sendMessage = useCallback(
    (draft: ChatMessageDraft) => {
      const socketId = socketSignaling.getSocketId();
      const timestamp = Date.now();
      const messageText = draft.message?.trim() || null;

      if (draft.type === "text" && !messageText) {
        return;
      }

      const id = createMessageId();
      const payload: ChatMessageInputPayload = {
        id,
        type: draft.type,
        message: messageText,
        attachment: draft.attachment || null,
        metadata: draft.metadata || null,
        timestamp,
      };

      const localMessage: ChatMessage = {
        id,
        type: payload.type,
        sender: {
          socketId: socketId || "unknown",
          userId: user?.id || "unknown",
          displayName: user?.firstName || user?.username || "You",
          avatarUrl: user?.imageUrl || null,
        },
        timestamp,
        message: payload.message,
        attachment: payload.attachment,
        metadata: payload.metadata,
        isOwn: true,
        localStatus: "sending",
      };

      actionsRef.current.addChatMessage(localMessage);

      trackEvent({ name: payload.type === "text" ? "chat_message_sent" : "chat_attachment_sent" });

      const sendOperation =
        payload.type === "text"
          ? socketSignaling.sendChatMessage(payload)
          : socketSignaling.sendChatAttachment(payload);

      sendOperation
        .then((ack) => {
          if (ack.ok) {
            actionsRef.current.updateChatMessageStatus(id, "sent");
          } else {
            actionsRef.current.updateChatMessageStatus(id, "failed");
            if (ack.error) {
              toast.error(ack.error);
            }
          }
        })
        .catch(() => {
          actionsRef.current.updateChatMessageStatus(id, "failed");
        });
    },
    [socketSignaling, user, createMessageId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socketSignaling.sendChatTyping(isTyping);
    },
    [socketSignaling]
  );

  const clearError = useCallback(() => {
    actionsRef.current.setError(null);
  }, []);

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      removeScreenTrackEndedListener();
      screenShare.stopScreenShare();
      actionsRef.current.setSharingScreen(false);
      actionsRef.current.setScreenStream(null);
      trackEvent({ name: "screen_share_stopped" });
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
        removeScreenTrackEndedListener();
        const stream = await screenShare.startScreenShare();
        const screenTrack = stream.getVideoTracks()[0];

        if (screenTrack) {
          const handler = () => {
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
          };
          screenTrackRef.current = screenTrack;
          screenTrackEndedHandlerRef.current = handler;
          screenTrack.addEventListener("ended", handler);

          await peerConnection.replaceVideoTrack(screenTrack);
          actionsRef.current.setSharingScreen(true);
          actionsRef.current.setScreenStream(stream);
          trackEvent({ name: "screen_share_started" });
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

  useEffect(() => {
    return () => {
      monitoring.stopMonitoring();
      recoveryController.stop();
      iceServerCache.resetSession();
      if (turnCredentialRefreshTimerRef.current) {
        clearInterval(turnCredentialRefreshTimerRef.current);
        turnCredentialRefreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useUnloadEndCall(
    isInActiveCall,
    () => isInActiveCall,
    () => socketSignaling.sendEndCall(),
    socketSignaling.getSocketId(),
    socketSignaling.socketRef,
    () => tabCoordination.releaseOwnership()
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
    isPeerTyping: state.isPeerTyping,
    peerInfo: state.peerInfo,
    sendMessage,
    sendTyping,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    swapCamera,
    toggleScreenShare,
    isSharingScreen,
    isPeerSharingScreen,
    sendFavoriteNotification: socketSignaling.sendFavoriteNotification,
    error: state.error,
    clearError,
    isPassive: tabCoordination.isPassive,
  };
}

export type { ConnectionStatus, ChatMessage };
