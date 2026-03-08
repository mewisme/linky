"use client";

import type { ChatMessage, ChatMessageDeliveryStatus } from "@/features/chat/types/chat-message.types";

import type { NetworkQuality } from "@/features/call/lib/webrtc/network-monitor";
import type { QualityTier } from "@/features/call/lib/webrtc/adaptive-encoding";
import type { UsersAPI } from "@/entities/user/types/users.types";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "searching"
  | "matched"
  | "in_call"
  | "reconnecting"
  | "ended";

export type OverlayCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface OverlayPosition {
  x: number;
  y: number;
}

interface VideoChatStore {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  remoteCameraEnabled: boolean;
  connectionStatus: ConnectionStatus;
  callStartedAt: number | null;
  chatMessages: ChatMessage[];
  error: string | null;
  peerInfo: UsersAPI.PublicUserInfo | null;
  overlayPosition: OverlayPosition | null;
  overlayCorner: OverlayCorner | null;
  isFloatingMode: boolean;
  floatingPosition: OverlayPosition | null;
  floatingCorner: OverlayCorner | null;
  networkQuality: NetworkQuality;
  isVideoStalled: boolean;
  currentQualityTier: QualityTier;
  isSharingScreen: boolean;
  isPeerSharingScreen: boolean;
  screenStream: MediaStream | null;
  isPeerTyping: boolean;
  callInitialProgress: UsersAPI.Progress.GetMe.Response | null;
  callInitialFavorites: ResourcesAPI.Favorites.Get.Response | null;

  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setVideoOff: (videoOff: boolean) => void;
  setRemoteMuted: (muted: boolean) => void;
  setRemoteCameraEnabled: (enabled: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCallStartedAt: (timestamp: number | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatMessageStatus: (id: string, status: ChatMessageDeliveryStatus) => void;
  clearChatMessages: () => void;
  setError: (error: string | null) => void;
  setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) => void;
  setOverlayPosition: (position: OverlayPosition | null) => void;
  setOverlayCorner: (corner: OverlayCorner | null) => void;
  setFloatingMode: (isFloating: boolean) => void;
  setFloatingPosition: (position: OverlayPosition | null) => void;
  setFloatingCorner: (corner: OverlayCorner | null) => void;
  setNetworkQuality: (quality: NetworkQuality) => void;
  setVideoStalled: (stalled: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  setSharingScreen: (sharing: boolean) => void;
  setPeerSharingScreen: (sharing: boolean) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setPeerTyping: (isTyping: boolean) => void;
  setCallInitialData: (
    progress: UsersAPI.Progress.GetMe.Response | null,
    favorites: ResourcesAPI.Favorites.Get.Response | null
  ) => void;

  resetState: () => void;
  resetPeerState: () => void;
  resetRuntimeState: () => void;
}

const chatMessageLimit = 200;

const initialState = {
  localStream: null as MediaStream | null,
  remoteStream: null as MediaStream | null,
  isMuted: false,
  isVideoOff: false,
  remoteMuted: false,
  remoteCameraEnabled: true,
  connectionStatus: "idle" as ConnectionStatus,
  callStartedAt: null as number | null,
  chatMessages: [] as ChatMessage[],
  error: null as string | null,
  peerInfo: null as UsersAPI.PublicUserInfo | null,
  overlayPosition: null as OverlayPosition | null,
  overlayCorner: null as OverlayCorner | null,
  isFloatingMode: false,
  floatingPosition: null as OverlayPosition | null,
  floatingCorner: null as OverlayCorner | null,
  networkQuality: "excellent" as NetworkQuality,
  isVideoStalled: false,
  currentQualityTier: "high" as QualityTier,
  isSharingScreen: false,
  isPeerSharingScreen: false,
  screenStream: null as MediaStream | null,
  isPeerTyping: false,
  callInitialProgress: null as UsersAPI.Progress.GetMe.Response | null,
  callInitialFavorites: null as ResourcesAPI.Favorites.Get.Response | null,
};

export const useVideoChatStore = create<VideoChatStore>((set) => ({
  ...initialState,

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setMuted: (muted) => set({ isMuted: muted }),
  setVideoOff: (videoOff) => set({ isVideoOff: videoOff }),
  setRemoteMuted: (muted) => set({ remoteMuted: muted }),
  setRemoteCameraEnabled: (enabled) => set({ remoteCameraEnabled: enabled }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCallStartedAt: (timestamp) => set({ callStartedAt: timestamp }),
  addChatMessage: (message) =>
    set((s) => {
      const exists = s.chatMessages.some((m) => m.id === message.id);
      if (exists) return s;
      const next = [...s.chatMessages, message];
      return { chatMessages: next.slice(-chatMessageLimit) };
    }),
  updateChatMessageStatus: (id, status) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((message) =>
        message.id === id ? { ...message, localStatus: status } : message
      ),
    })),
  clearChatMessages: () => set({ chatMessages: [] }),
  setError: (error) => set({ error }),
  setPeerInfo: (peerInfo) => set({ peerInfo }),
  setOverlayPosition: (position) => set({ overlayPosition: position }),
  setOverlayCorner: (corner) => set({ overlayCorner: corner }),
  setFloatingMode: (isFloating) => set({ isFloatingMode: isFloating }),
  setFloatingPosition: (position) => set({ floatingPosition: position }),
  setFloatingCorner: (corner) => set({ floatingCorner: corner }),
  setNetworkQuality: (quality) => set({ networkQuality: quality }),
  setVideoStalled: (stalled) => set({ isVideoStalled: stalled }),
  setQualityTier: (tier) => set({ currentQualityTier: tier }),
  setSharingScreen: (sharing) => set({ isSharingScreen: sharing }),
  setPeerSharingScreen: (sharing) => set({ isPeerSharingScreen: sharing }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setPeerTyping: (isTyping) => set({ isPeerTyping: isTyping }),
  setCallInitialData: (progress, favorites) =>
    set({ callInitialProgress: progress, callInitialFavorites: favorites }),

  resetState: () => set(initialState),
  resetPeerState: () =>
    set({
      remoteStream: null,
      remoteMuted: false,
      remoteCameraEnabled: true,
      chatMessages: [],
      callStartedAt: null,
      error: null,
      peerInfo: null,
      networkQuality: "excellent",
      isVideoStalled: false,
      currentQualityTier: "high",
      isPeerSharingScreen: false,
      isPeerTyping: false,
    }),
  resetRuntimeState: () =>
    set({
      localStream: null,
      remoteStream: null,
      remoteMuted: false,
      chatMessages: [],
      error: null,
      peerInfo: null,
      networkQuality: "excellent",
      isVideoStalled: false,
      currentQualityTier: "high",
      isSharingScreen: false,
      isPeerSharingScreen: false,
      screenStream: null,
      isPeerTyping: false,
    }),
}));
