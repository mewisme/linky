"use client";

import { useMemo } from "react";

import type { UsersAPI } from "@/types/users.types";
import {
  useVideoChatStore,
  type ChatMessage,
  type ConnectionStatus,
} from "@/stores/video-chat-store";

export type { ConnectionStatus, ChatMessage };

export function getConnectionStatusMessage(status: ConnectionStatus): string {
  const statusMessages: Record<ConnectionStatus, string> = {
    idle: "Ready",
    searching: "Searching...",
    connecting: "Connecting...",
    connected: "Connected",
    reconnecting: "Reconnecting...",
    "peer-disconnected": "Disconnected",
  };
  return statusMessages[status];
}

export function useVideoChatState() {
  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const isMuted = useVideoChatStore((s) => s.isMuted);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const callStartedAt = useVideoChatStore((s) => s.callStartedAt);
  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const error = useVideoChatStore((s) => s.error);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);

  const state = useMemo(
    () => ({
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      remoteMuted,
      connectionStatus,
      callStartedAt,
      chatMessages,
      error,
      peerInfo,
    }),
    [
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      remoteMuted,
      connectionStatus,
      callStartedAt,
      chatMessages,
      error,
      peerInfo,
    ]
  );

  const actions = useMemo(
    () => ({
      setLocalStream: (stream: MediaStream | null) =>
        useVideoChatStore.getState().setLocalStream(stream),
      setRemoteStream: (stream: MediaStream | null) =>
        useVideoChatStore.getState().setRemoteStream(stream),
      setConnectionStatus: (status: ConnectionStatus) =>
        useVideoChatStore.getState().setConnectionStatus(status),
      setCallStartedAt: (timestamp: number | null) =>
        useVideoChatStore.getState().setCallStartedAt(timestamp),
      setMuted: (muted: boolean) => useVideoChatStore.getState().setMuted(muted),
      setVideoOff: (videoOff: boolean) =>
        useVideoChatStore.getState().setVideoOff(videoOff),
      setRemoteMuted: (muted: boolean) =>
        useVideoChatStore.getState().setRemoteMuted(muted),
      addChatMessage: (message: ChatMessage) =>
        useVideoChatStore.getState().addChatMessage(message),
      clearChatMessages: () =>
        useVideoChatStore.getState().clearChatMessages(),
      setError: (error: string | null) =>
        useVideoChatStore.getState().setError(error),
      setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) =>
        useVideoChatStore.getState().setPeerInfo(peerInfo),
      resetState: () => useVideoChatStore.getState().resetState(),
      resetPeerState: () => useVideoChatStore.getState().resetPeerState(),
      resetRuntimeState: () => useVideoChatStore.getState().resetRuntimeState(),
    }),
    []
  );

  return {
    state,
    actions,
  };
}
