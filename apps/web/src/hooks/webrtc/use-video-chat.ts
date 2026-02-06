"use client";

import { useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UsersAPI } from "@/types/users.types";

import { useUserContext } from "@/components/providers/user/user-provider";
import { useMediaStream } from "./use-media-stream";
import { usePeerConnection } from "./use-peer-connection";
import { useScreenShare } from "./use-screen-share";
import { useSocketSignaling } from "../socket/use-socket-signaling";
import { useVideoChatState, type ConnectionStatus, type ChatMessage } from "./use-video-chat-state";
import { useVideoChatStore } from "@/stores/video-chat-store";
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

  const { state, actions } = useVideoChatState();

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const mediaStream = useMediaStream();
  const socketSignaling = useSocketSignaling();
  const screenShare = useScreenShare();
  const isSharingScreen = useVideoChatStore((s) => s.isSharingScreen);
  const isPeerSharingScreen = useVideoChatStore((s) => s.isPeerSharingScreen);

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
    return (
      state.callStartedAt !== null &&
      (state.connectionStatus === "matched" ||
        state.connectionStatus === "in_call" ||
        state.connectionStatus === "reconnecting")
    );
  }, [state.callStartedAt, state.connectionStatus]);

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
    isInActiveCall,
    () => socketSignaling.isInActiveCallRef.current,
    () => socketSignaling.sendEndCall(),
    socketSignaling.getSocketId(),
    socketSignaling.socketRef
  );

  const startWrapped = () => lifecycle.start(peerCallbacks, socketCallbacks as Record<string, (...args: unknown[]) => void>);

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
      } catch {
        actionsRef.current.setSharingScreen(false);
      }
    }
  };

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
    toggleScreenShare,
    isSharingScreen,
    isPeerSharingScreen,
    sendFavoriteNotification: socketSignaling.sendFavoriteNotification,
    error: state.error,
    clearError: lifecycle.clearError,
  };
}

export type { ConnectionStatus, ChatMessage };
