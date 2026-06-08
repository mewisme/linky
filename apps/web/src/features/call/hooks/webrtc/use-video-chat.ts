"use client";

import * as Sentry from "@sentry/nextjs";
import type { ApiUserMessage } from "@/shared/types/api-message.types";
import { useTranslations } from "next-intl";
import { useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@ws/ui/internal-lib/react-query";
import { toast } from "@ws/ui/components/ui/sonner";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";

import type { UsersAPI } from "@/entities/user/types/users.types";
import { normalizePublicUserInfo } from "@/shared/lib/normalize-public-user-info";
import type { UserFacingSocketPayload } from "@/lib/realtime/socket";
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
import { useScreenShare } from "./use-screen-share";
import { useSocketSignaling } from "@/features/realtime/hooks/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus } from "./use-video-chat-state";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useUnloadEndCall } from "./use-unload-end-call";
import { useSocket } from "@/features/realtime/hooks/use-socket";
import { useWebRTCMonitoring } from "./use-webrtc-monitoring";
import { useCloudflareSfuConnection } from "./use-cloudflare-sfu-connection";
import { useCallTabCoordination } from "../call-coordination/use-call-tab-coordination";

import type { RealtimePeerTracksPayload, VideoMediaProvider } from "@/lib/realtime/socket";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { resolveActionErrorMessage } from "@/shared/lib/i18n/resolve-action-error-message";
import { resolveBackendMessage } from "@/shared/lib/i18n/resolve-backend-message";
import { normalizeUserCallPreferences } from "@/entities/user/lib/user-settings-preferences";
import { isCallMediaReadyForInCall } from "@/features/call/lib/webrtc/call-media-readiness";

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
  applyStreamQuality: (quality: import("@/entities/user/lib/user-settings-preferences").StreamVideoQuality) => Promise<void>;
  error: string | null;
  clearError: () => void;
  isPassive: boolean;
}

export function useVideoChat(): UseVideoChatReturn {
  const chatMessageMaxLength = 200;
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
  const t = useTranslations();
  const resolveUserMessage = useCallback(
    (msg: ApiUserMessage) =>
      resolveBackendMessage(msg, t as (key: string, values?: Record<string, unknown>) => string),
    [t],
  );

  const { state, actions } = useVideoChatState();

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();
  const socketSignaling = useSocketSignaling();
  const screenShare = useScreenShare();
  const monitoring = useWebRTCMonitoring();
  const isSharingScreen = useVideoChatStore((s) => s.isSharingScreen);
  const isPeerSharingScreen = useVideoChatStore((s) => s.isPeerSharingScreen);

  const refreshUserProgress = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["user-progress"], type: "active" });
  }, [queryClient]);

  const progressRefetchInFlightRef = useRef(false);
  const progressRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleProgressRefetch = useCallback((retryOnFailure: boolean) => {
    if (progressRefetchInFlightRef.current) return;
    progressRefetchInFlightRef.current = true;
    void refreshUserProgress().finally(() => {
      progressRefetchInFlightRef.current = false;
    });
    if (!retryOnFailure) return;
    if (progressRetryTimerRef.current) {
      clearTimeout(progressRetryTimerRef.current);
    }
    progressRetryTimerRef.current = setTimeout(() => {
      progressRetryTimerRef.current = null;
      void refreshUserProgress();
    }, 3000);
  }, [refreshUserProgress]);

  // Backend emits `user:progress:applied` once the post-call EXP/streak
  // pipeline has finished writing to Postgres for this user. Refetch
  // immediately when it arrives so the UI shows fresh values without polling.
  useEffect(() => {
    const socket = socketSignaling.getSocket();
    if (!socket) return;
    const onApplied = (data: { ok?: boolean }) => {
      scheduleProgressRefetch(data.ok === false);
    };
    socket.on("user:progress:applied", onApplied);
    return () => {
      socket.off("user:progress:applied", onApplied);
      if (progressRetryTimerRef.current) {
        clearTimeout(progressRetryTimerRef.current);
        progressRetryTimerRef.current = null;
      }
    };
  }, [socketSignaling, scheduleProgressRefetch]);

  const sfuConnection = useCloudflareSfuConnection({
    getToken: async () => {
      try {
        return await getTokenRef.current();
      } catch {
        return null;
      }
    },
  });

  const tabCoordination = useCallTabCoordination({
    scopeId: user?.id ?? null,
    onOwnershipLost: () => {
      monitoring.stopMonitoring();
      void sfuConnection.cleanup();
      mediaStream.releaseMedia();
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

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackEndedHandlerRef = useRef<(() => void) | null>(null);

  const hasShownConnectedToastRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const connectionStatusRef = useRef(state.connectionStatus);
  connectionStatusRef.current = state.connectionStatus;

  const isInActiveCall = useMemo(() => {
    return (
      state.callStartedAt !== null &&
      (state.connectionStatus === "in_call" || state.connectionStatus === "reconnecting")
    );
  }, [state.callStartedAt, state.connectionStatus]);

  const activeRoomIdRef = useRef<string | null>(null);
  const hasEnteredInCallRef = useRef(false);
  const transportReadyRef = useRef(false);

  const resetCallEntryGate = useCallback(() => {
    hasEnteredInCallRef.current = false;
    transportReadyRef.current = false;
    activeRoomIdRef.current = null;
  }, []);

  const isActiveCallStatus = useCallback((status: ConnectionStatus) => {
    return status === "matched" || status === "in_call" || status === "reconnecting";
  }, []);

  const hasActiveCallMedia = useCallback(() => {
    return sfuConnection.getRoomId() != null;
  }, [sfuConnection]);

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

  const tryEnterInCall = useCallback(() => {
    if (hasEnteredInCallRef.current) return;

    const status = connectionStatusRef.current;
    if (status !== "matched" && status !== "reconnecting") return;

    const store = useVideoChatStore.getState();
    if (
      !isCallMediaReadyForInCall({
        localStream: mediaStream.getStream(),
        remoteStream: store.remoteStream,
        remoteCameraEnabled: store.remoteCameraEnabled,
        transportReady: transportReadyRef.current,
      })
    ) {
      return;
    }

    hasEnteredInCallRef.current = true;
    const startedAt = Date.now();
    tabCoordination.claimOwnership(activeRoomIdRef.current, startedAt);
    actionsRef.current.setCallStartedAt(startedAt);
    actionsRef.current.setConnectionStatus("in_call");
    trackEvent({ name: "call_started" });

    if (!hasShownConnectedToastRef.current && !isReconnectingRef.current) {
      hasShownConnectedToastRef.current = true;
      toast.success(t("call.connectedToast"));
      play("join_call");
    }

    if (isReconnectingRef.current) {
      completeReconnection();
    }
  }, [mediaStream, tabCoordination, t, play, completeReconnection]);

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

  const stopActiveScreenShare = useCallback(() => {
    removeScreenTrackEndedListener();
    screenShare.stopScreenShare();
    actionsRef.current.setSharingScreen(false);
    actionsRef.current.setScreenStream(null);
    socketSignaling.sendScreenShareToggle(false);
  }, [removeScreenTrackEndedListener, screenShare, socketSignaling]);

  const resetPeerState = useCallback(() => {
    resetCallEntryGate();
    stopActiveScreenShare();
    void sfuConnection.cleanup();
    mediaStream.releaseMedia();
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
    actionsRef.current.setMuted(false);
    actionsRef.current.setVideoOff(false);
  }, [mediaStream, sfuConnection, stopActiveScreenShare, resetCallEntryGate]);

  const resetRuntimeState = useCallback(() => {
    stopActiveScreenShare();
    void sfuConnection.cleanup();
    mediaStream.releaseMedia();
    actionsRef.current.resetRuntimeState();
  }, [mediaStream, sfuConnection, stopActiveScreenShare]);

  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  const initializeConnectionRef = useCallback(
    (socketCallbacks: Record<string, (...args: unknown[]) => void>) => {
      return async () => {
        // SFU only: the RTCPeerConnection is created lazily inside the SFU
        // connection hook on the `matched` event. We just open the Socket.IO
        // connection and join the queue here.
        await socketSignaling.initializeSocket(socketCallbacks as never);
        actionsRef.current.setConnectionStatus("searching");
        socketSignaling.joinQueue();
      };
    },
    [socketSignaling]
  );

  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => {
        const currentStatus = connectionStatusRef.current;
        if (currentStatus === "searching") {
          socketSignaling.joinQueue();
        } else if (isReconnectingRef.current) {
          socketSignaling.requestResync();
          const pc = sfuConnection.getPeerConnection();
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
            return;
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
        actionsRef.current.setError(t("call.failedConnectServer"));
        toast.error(t("call.connectErrorToast"), {
          action: {
            label: t("call.globalError.reload"),
            onClick: () => {
              window.location.reload();
            },
          },
        });
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

      onJoinedQueue: (_data: UserFacingSocketPayload & { queueSize: number }) => {
        actionsRef.current.setConnectionStatus("searching");
        trackEvent({ name: "matchmaking_started" });
      },

      onMatched: async (data: { roomId: string; peerId: string; socketId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null; mediaProvider: VideoMediaProvider; realtimeSessionId?: string }) => {
        isReconnectingRef.current = false;
        hasShownConnectedToastRef.current = false;

        actionsRef.current.setError(null);
        resetCallEntryGate();
        activeRoomIdRef.current = data.roomId;
        transportReadyRef.current = false;
        actionsRef.current.setConnectionStatus("matched");
        actionsRef.current.setPeerInfo(normalizePublicUserInfo(data.peerInfo));
        actionsRef.current.setRemoteCameraEnabled(true);
        trackEvent({ name: "matchmaking_matched" });

        const localStream = mediaStream.getStream();
        if (!localStream) {
          Sentry.logger.error("No local stream available for match");
          return;
        }

        const socketId =
          data.socketId ?? socketSignaling.getSocket()?.id ?? socketSignaling.getSocketId();
        if (!socketId) {
          Sentry.logger.error("No socketId available for SFU match");
          actionsRef.current.setError(t("call.failedEstablishConnection"));
          return;
        }
        socketSignaling.sendVideoToggle(useVideoChatStore.getState().isVideoOff);
        try {
          const pc = await sfuConnection.connect({
            roomId: data.roomId,
            socketId,
            localStream,
            realtimeSessionId: data.realtimeSessionId,
            callbacks: {
              onTrack: (stream) => {
                actionsRef.current.setRemoteStream(stream);
                tryEnterInCall();
              },
              onRemoteMediaUpdated: () => {
                tryEnterInCall();
              },
              onConnectionStateChange: (connectionState) => {
                if (connectionState === "connected") {
                  transportReadyRef.current = true;
                  if (hasEnteredInCallRef.current) {
                    actionsRef.current.setConnectionStatus("in_call");
                    if (isReconnectingRef.current) {
                      completeReconnection();
                    }
                  } else {
                    tryEnterInCall();
                  }
                } else if (connectionState === "failed" || connectionState === "disconnected") {
                  actionsRef.current.setConnectionStatus("reconnecting");
                  hasShownConnectedToastRef.current = false;
                  startReconnecting();
                }
              },
            },
          });
          const callPrefs = normalizeUserCallPreferences(userSettings?.call);
          monitoring.initializeMonitoring(
            pc,
            isMobile,
            {
              onNetworkQualityChange: (quality) => {
                actionsRef.current.setNetworkQuality(quality);
              },
              onVideoStalled: (stalled) => {
                actionsRef.current.setVideoStalled(stalled);
              },
              onQualityTierChange: (tier) => {
                actionsRef.current.setQualityTier(tier);
              },
            },
            {
              isRemoteVideoExpected: () => useVideoChatStore.getState().remoteCameraEnabled,
            },
            callPrefs.quality,
          );
          transportReadyRef.current = true;
          tryEnterInCall();
        } catch (err) {
          Sentry.logger.error("Cloudflare SFU connect failed", { error: err });
          actionsRef.current.setError(t("call.failedEstablishConnection"));
          actionsRef.current.setConnectionStatus("ended");
          resetCallEntryGate();
        }
      },

      onPeerLeft: (data: UserFacingSocketPayload & { queueSize?: number }) => {
        monitoring.stopMonitoring();
        void sfuConnection.cleanup();
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setConnectionStatus("ended");

        const text = resolveUserMessage(data.userMessage);
        if (data.queueSize !== undefined) {
          actionsRef.current.setError(null);
          toast.info(text);
        } else {
          toast.error(text);
        }
      },

      onPeerSkipped: (data: UserFacingSocketPayload & { queueSize: number }) => {
        monitoring.stopMonitoring();
        void sfuConnection.cleanup();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setError(null);
        toast.info(resolveUserMessage(data.userMessage));
      },

      onSkipped: (data: UserFacingSocketPayload & { queueSize: number }) => {
        monitoring.stopMonitoring();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        void sfuConnection.cleanup();
        actionsRef.current.clearChatMessages();
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setCallStartedAt(null);
        toast.info(resolveUserMessage(data.userMessage));
      },

      onEndCall: (data: UserFacingSocketPayload) => {
        const currentStatus = connectionStatusRef.current;
        if (!isActiveCallStatus(currentStatus) && !hasActiveCallMedia()) {
          return;
        }

        isReconnectingRef.current = false;
        monitoring.stopMonitoring();
        toast.info(resolveUserMessage(data.userMessage));
        play("leave_call");
        actionsRef.current.setConnectionStatus("ended");
        actionsRef.current.setCallStartedAt(null);
        actionsRef.current.setPeerTyping(false);
        actionsRef.current.setRemoteStream(null);
        resetPeerState();
      },

      onRealtimePeerTracks: async (data: RealtimePeerTracksPayload) => {
        try {
          await sfuConnection.handlePeerTracks(data);
        } catch (err) {
          Sentry.logger.error("Failed to handle peer tracks", { error: err });
        }
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
        toast.error(resolveUserMessage(data.userMessage));
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

      onQueueTimeout: (data: UserFacingSocketPayload) => {
        const text = resolveUserMessage(data.userMessage);
        actionsRef.current.setError(text);
        actionsRef.current.setConnectionStatus("idle");
        toast.error(t("call.queueTimeoutToast", { message: text }));
      },

      onDequeued: (data: { reason: string }) => {
        const currentStatus = connectionStatusRef.current;
        const reasonNorm = (data.reason ?? "").toLowerCase();
        if (currentStatus === "searching") {
          if (reasonNorm.includes("matched")) {
            return;
          }
          actionsRef.current.setConnectionStatus("idle");
          toast.error(t("call.removedFromQueue"));
        }
      },

      onError: (data: UserFacingSocketPayload) => {
        const currentStatus = connectionStatusRef.current;
        if (
          data.userMessage.code === "RESYNC_NO_ROOM" &&
          (isActiveCallStatus(currentStatus) || hasActiveCallMedia())
        ) {
          isReconnectingRef.current = false;
          actionsRef.current.setConnectionStatus("ended");
          actionsRef.current.setCallStartedAt(null);
          actionsRef.current.setRemoteStream(null);
          resetPeerState();
        }

        const text = resolveUserMessage(data.userMessage);
        actionsRef.current.setError(text);
        toast.error(t("call.errorToast", { message: text }));
      },

      onFavoriteAdded: (data: { from_user_id: string; from_user_name: string }) => {
        toast.success(t("call.addedToFavorites", { name: data.from_user_name }));
      },

      onFavoriteAddedSelf: () => {
      },

      onFavoriteRemoved: (data: { from_user_id: string; from_user_name: string }) => {
        toast.info(t("call.removedFromFavorites", { name: data.from_user_name }));
      },

      onFavoriteRemovedSelf: () => {
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mediaStream,
      socketSignaling,
      sfuConnection,
      resetPeerState,
      resetRuntimeState,
      startReconnecting,
      completeReconnection,
      refreshUserProgress,
      getToken,
      monitoring,
      isMobile,
      t,
      resolveUserMessage,
      isActiveCallStatus,
      hasActiveCallMedia,
      tryEnterInCall,
      resetCallEntryGate,
    ]
  );

  const start = useCallback(async () => {
    try {
      actionsRef.current.setError(null);

      if (authLoading) {
        return;
      }

      if (!authReady) {
        actionsRef.current.setError(t("errors.authRequired"));
        return;
      }

      const token = await getToken();
      if (!token) {
        actionsRef.current.setError(t("errors.authRequired"));
        return;
      }

      const socket = socketSignaling.getSocket();
      if (!socket?.connected) {
        actionsRef.current.setError(t("call.connectionNotReady"));
        toast.error(t("call.connectionNotReadyToast"));
        return;
      }

      const claimed = tabCoordination.claimOwnership(null);
      if (!claimed) {
        actionsRef.current.setError(null);
        toast.error(t("call.activeInOtherTab"));
        return;
      }

      const callPrefs = normalizeUserCallPreferences(userSettings?.call);
      const initialMuted = callPrefs.default_mute_mic;
      const initialVideoOff = callPrefs.default_disable_camera;

      actionsRef.current.setMuted(initialMuted);
      actionsRef.current.setVideoOff(initialVideoOff);

      const stream = await mediaStream.acquireMedia(initialMuted, initialVideoOff, callPrefs.quality);

      if (!mediaStream.hasCamera()) {
        actionsRef.current.setVideoOff(true);
      }

      actionsRef.current.setLocalStream(stream);

      const initialize = initializeConnectionRef(socketCallbacks as Record<string, (...args: unknown[]) => void>);
      await initialize();
    } catch (err) {
      Sentry.logger.error("Error starting video chat", { error: err instanceof Error ? err.message : "Unknown error" });
      const message = resolveActionErrorMessage(err, t, "call.failedToStart");
      actionsRef.current.setConnectionStatus("idle");
      tabCoordination.releaseOwnership();
      cleanup();
      actionsRef.current.setError(message);
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
    socketCallbacks,
    tabCoordination,
  ]);

  const skip = useCallback(() => {
    void sfuConnection.cleanup();
    actionsRef.current.setRemoteStream(null);
    actionsRef.current.clearChatMessages();
    actionsRef.current.setRemoteMuted(false);
    actionsRef.current.setCallStartedAt(null);
    actionsRef.current.setConnectionStatus("searching");
    socketSignaling.skipPeer();
    trackEvent({ name: "matchmaking_skipped" });
  }, [sfuConnection, socketSignaling]);

  const endCall = useCallback(() => {
    monitoring.stopMonitoring();
    socketSignaling.sendEndCall();
    trackEvent({ name: "call_ended" });
    toast.info(t("call.youEndedCall"));
    actionsRef.current.setConnectionStatus("ended");
    actionsRef.current.setCallStartedAt(null);
    tabCoordination.releaseOwnership();
    resetPeerState();
  }, [socketSignaling, resetPeerState, tabCoordination, monitoring, t]);

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

    const sfuPc = sfuConnection.getPeerConnection();
    if (!sfuPc) return;
    const sender = sfuPc
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");
    if (sender) {
      try {
        await sender.replaceTrack(nextTrack);
      } catch (err) {
        Sentry.logger.warn("Failed to replace video track on SFU sender", { error: err });
      }
    }
  }, [mediaStream, sfuConnection]);

  const createMessageId = useCallback(() => {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const splitMessageText = useCallback((message: string) => {
    if (message.length <= chatMessageMaxLength) {
      return [message];
    }
    const chunks: string[] = [];
    for (let start = 0; start < message.length; start += chatMessageMaxLength) {
      chunks.push(message.slice(start, start + chatMessageMaxLength));
    }
    return chunks;
  }, []);

  const sendMessage = useCallback(
    (draft: ChatMessageDraft) => {
      const socketId = socketSignaling.getSocketId();
      const messageText = draft.message?.trim() || null;

      if (draft.type === "text" && !messageText) {
        return;
      }

      const baseTimestamp = Date.now();
      const messageParts =
        draft.type === "text" && messageText
          ? splitMessageText(messageText)
          : [messageText];
      const payloads: ChatMessageInputPayload[] = messageParts.map((part, index) => ({
        id: createMessageId(),
        type: draft.type,
        message: part,
        attachment: draft.attachment || null,
        metadata: draft.metadata || null,
        timestamp: baseTimestamp + index,
      }));

      for (const payload of payloads) {
        const localMessage: ChatMessage = {
          id: payload.id,
          type: payload.type,
          sender: {
            socketId: socketId || "unknown",
            userId: user?.id || "unknown",
            displayName: user?.firstName || user?.username || "You",
            avatarUrl: user?.imageUrl || null,
          },
          timestamp: payload.timestamp ?? baseTimestamp,
          message: payload.message,
          attachment: payload.attachment,
          metadata: payload.metadata,
          isOwn: true,
          localStatus: "sending",
        };
        actionsRef.current.addChatMessage(localMessage);
      }

      trackEvent({ name: draft.type === "text" ? "chat_message_sent" : "chat_attachment_sent" });

      void (async () => {
        for (const payload of payloads) {
          const sendOperation =
            payload.type === "text"
              ? socketSignaling.sendChatMessage(payload)
              : socketSignaling.sendChatAttachment(payload);
          try {
            const ack = await sendOperation;
            if (ack.ok) {
              actionsRef.current.updateChatMessageStatus(payload.id, "sent");
            } else {
              actionsRef.current.updateChatMessageStatus(payload.id, "failed");
              if (ack.error) {
                toast.error(ack.error);
              }
            }
          } catch {
            actionsRef.current.updateChatMessageStatus(payload.id, "failed");
          }
        }
      })();
    },
    [socketSignaling, user, createMessageId, splitMessageText]
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
    const sfuPc = sfuConnection.getPeerConnection();
    if (!sfuPc) {
      toast.error(t("call.screenShareFailed"));
      return;
    }
    const replaceSenderVideoTrack = async (track: MediaStreamTrack | null) => {
      const sender = sfuPc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (!sender) {
        throw new Error("No video sender available for screen share");
      }
      await sender.replaceTrack(track);
    };

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
          try {
            await replaceSenderVideoTrack(cameraTrack);
          } catch (err) {
            Sentry.logger.error("Failed to swap camera track back after screen share", { error: err });
          }
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
                void replaceSenderVideoTrack(cameraTrack);
              }
            }
          };
          screenTrackRef.current = screenTrack;
          screenTrackEndedHandlerRef.current = handler;
          screenTrack.addEventListener("ended", handler);

          await replaceSenderVideoTrack(screenTrack);
          actionsRef.current.setSharingScreen(true);
          actionsRef.current.setScreenStream(stream);
          trackEvent({ name: "screen_share_started" });
          socketSignaling.sendScreenShareToggle(true, stream.id);
        }
      } catch (error) {
        actionsRef.current.setSharingScreen(false);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage !== "Screen sharing cancelled or failed") {
          toast.error(t("call.screenShareFailed"));
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      monitoring.stopMonitoring();
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

  const applyStreamQuality = useCallback(
    async (quality: import("@/entities/user/lib/user-settings-preferences").StreamVideoQuality) => {
      await monitoring.applyStreamQuality(quality);
      await mediaStream.setQuality(quality);
    },
    [mediaStream, monitoring],
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
    applyStreamQuality,
    error: state.error,
    clearError,
    isPassive: tabCoordination.isPassive,
  };
}

export type { ConnectionStatus, ChatMessage };
