"use client";

import { useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UsersAPI } from "@/types/users.types";

import { useUserContext } from "@/components/providers/user/user-provider";
import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useSocketSignaling } from "../socket/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";
import { useUnloadEndCall } from "./use-unload-end-call";
import { useSocket } from "../socket/use-socket";
import { useVideoChatIce } from "./use-video-chat/use-video-chat-ice";
import { useVideoChatReconnect } from "./use-video-chat/use-video-chat-reconnect";
import { useVideoChatCallbacks } from "./use-video-chat/use-video-chat-callbacks";
import { useVideoChatLifecycle } from "./use-video-chat/use-video-chat-lifecycle";

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

  const { state, actions } = useVideoChatState();

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();
  const socketSignaling = useSocketSignaling();

  const refreshUserProgress = () => {
    queryClient.invalidateQueries({ queryKey: ["user-progress"] });
  };

  const tempPeerConnection = usePeerConnection([]);

  const { iceServersRef, isOffererRef } = useVideoChatIce({
    getToken,
    peerConnection: tempPeerConnection,
    socketSignaling,
    connectionStatus: state.connectionStatus,
    authReady,
    actionsRef,
  });

  const peerConnection = usePeerConnection(iceServersRef.current);

  const {
    hasShownConnectedToastRef,
    isReconnectingRef,
    startReconnecting,
    completeReconnection,
  } = useVideoChatReconnect({
    connectionStatus: state.connectionStatus,
    isSocketHealthy,
  });

  const isInActiveCall = useMemo(() => {
    // WARNING: UI state must remain stable during reconnections and ICE restarts
    // Use callStartedAt as the source of truth to prevent UI desync
    return (
      state.callStartedAt !== null &&
      (state.connectionStatus === "connected" ||
        state.connectionStatus === "reconnecting" ||
        (state.connectionStatus === "connecting" && !!state.remoteStream))
    );
  }, [state.callStartedAt, state.connectionStatus, state.remoteStream]);

  useEffect(() => {
    // WARNING: Only set callStartedAt when truly starting a call, never during reconnections
    const shouldStartCall =
      !!state.remoteStream &&
      state.connectionStatus === "connected" &&
      state.callStartedAt === null;

    // WARNING: Only clear callStartedAt on explicit disconnect states
    const shouldEndCall =
      state.callStartedAt !== null &&
      (state.connectionStatus === "idle" ||
        state.connectionStatus === "peer-disconnected");

    if (shouldStartCall) {
      const callStartedAt = Date.now();
      actionsRef.current.setCallStartedAt(callStartedAt);
      if (process.env.NODE_ENV === "development") {
        console.log("[UIHydration] Call started - setting callStartedAt", {
          callStartedAt,
          remoteStream: !!state.remoteStream,
          connectionStatus: state.connectionStatus,
        });
      }
    } else if (shouldEndCall) {
      actionsRef.current.setCallStartedAt(null);
      if (process.env.NODE_ENV === "development") {
        console.log("[UIHydration] Call ended - clearing callStartedAt", {
          remoteStream: !!state.remoteStream,
          connectionStatus: state.connectionStatus,
        });
      }
    }
  }, [state.remoteStream, state.connectionStatus, state.callStartedAt]);

  const lifecycle = useVideoChatLifecycle({
    user,
    getToken,
    userSettings,
    authReady,
    authLoading,
    mediaStream,
    peerConnection,
    socketSignaling,
    iceServersRef,
    actionsRef,
    refreshUserProgress,
  });

  const { peerCallbacks, socketCallbacks } = useVideoChatCallbacks({
    mediaStream,
    peerConnection,
    socketSignaling,
    connectionStatus: state.connectionStatus,
    iceServersRef,
    isOffererRef,
    hasShownConnectedToastRef,
    isReconnectingRef,
    actionsRef,
    getToken,
    startReconnecting,
    completeReconnection,
    resetPeerState: lifecycle.resetPeerState,
    resetRuntimeState: lifecycle.resetRuntimeState,
    refreshUserProgress,
  });

  useUnloadEndCall(
    () => socketSignaling.isInActiveCallRef.current,
    () => socketSignaling.sendEndCall(),
    socketSignaling.getSocketId(),
    socketSignaling.socketRef
  );

  const startWrapped = () => lifecycle.start(peerCallbacks, socketCallbacks as Record<string, (...args: unknown[]) => void>);

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
    sendMessage: lifecycle.sendMessage,
    start: startWrapped,
    skip: lifecycle.skip,
    endCall: lifecycle.endCall,
    toggleMute: lifecycle.toggleMute,
    toggleVideo: lifecycle.toggleVideo,
    sendFavoriteNotification: socketSignaling.sendFavoriteNotification,
    error: state.error,
    clearError: lifecycle.clearError,
  };
}

export type { ConnectionStatus, ChatMessage };
