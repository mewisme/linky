"use client";

import { useMemo } from "react";

import type { UsersAPI } from "@/types/users.types";
import {
  useVideoChatStore,
  type ChatMessage,
  type ConnectionStatus,
} from "@/stores/video-chat-store";
import type { NetworkQuality } from "@/lib/webrtc/network-monitor";
import type { QualityTier } from "@/lib/webrtc/adaptive-encoding";

export type { ConnectionStatus, ChatMessage };

export interface VideoChatActions {
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCallStartedAt: (timestamp: number | null) => void;
  setMuted: (muted: boolean) => void;
  setVideoOff: (videoOff: boolean) => void;
  setRemoteMuted: (muted: boolean) => void;
  setRemoteCameraEnabled: (enabled: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setError: (error: string | null) => void;
  setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) => void;
  setNetworkQuality: (quality: NetworkQuality) => void;
  setVideoStalled: (stalled: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  setSharingScreen: (sharing: boolean) => void;
  setPeerSharingScreen: (sharing: boolean) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  resetState: () => void;
  resetPeerState: () => void;
  resetRuntimeState: () => void;
}

export function getConnectionStatusMessage(status: ConnectionStatus): string {
  const statusMessages: Record<ConnectionStatus, string> = {
    idle: "Ready",
    searching: "Searching...",
    matched: "Matched",
    in_call: "In call",
    reconnecting: "Reconnecting...",
    ended: "Ended",
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
      setRemoteCameraEnabled: (enabled: boolean) =>
        useVideoChatStore.getState().setRemoteCameraEnabled(enabled),
      addChatMessage: (message: ChatMessage) =>
        useVideoChatStore.getState().addChatMessage(message),
      clearChatMessages: () =>
        useVideoChatStore.getState().clearChatMessages(),
      setError: (error: string | null) =>
        useVideoChatStore.getState().setError(error),
      setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) =>
        useVideoChatStore.getState().setPeerInfo(peerInfo),
      setNetworkQuality: (quality: NetworkQuality) =>
        useVideoChatStore.getState().setNetworkQuality(quality),
      setVideoStalled: (stalled: boolean) =>
        useVideoChatStore.getState().setVideoStalled(stalled),
      setQualityTier: (tier: QualityTier) =>
        useVideoChatStore.getState().setQualityTier(tier),
      setSharingScreen: (sharing: boolean) =>
        useVideoChatStore.getState().setSharingScreen(sharing),
      setPeerSharingScreen: (sharing: boolean) =>
        useVideoChatStore.getState().setPeerSharingScreen(sharing),
      setScreenStream: (stream: MediaStream | null) =>
        useVideoChatStore.getState().setScreenStream(stream),
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
