"use client";

import type { UsersAPI } from "@/types/users.types";
import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "peer-disconnected";

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  senderId: string;
  senderName?: string;
  senderImageUrl?: string;
  isOwn: boolean;
}

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

  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setVideoOff: (videoOff: boolean) => void;
  setRemoteMuted: (muted: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCallStartedAt: (timestamp: number | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setError: (error: string | null) => void;
  setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) => void;
  setOverlayPosition: (position: OverlayPosition | null) => void;
  setOverlayCorner: (corner: OverlayCorner | null) => void;
  setFloatingMode: (isFloating: boolean) => void;
  setFloatingPosition: (position: OverlayPosition | null) => void;
  setFloatingCorner: (corner: OverlayCorner | null) => void;

  resetState: () => void;
  resetPeerState: () => void;
  resetRuntimeState: () => void;
}

const initialState = {
  localStream: null as MediaStream | null,
  remoteStream: null as MediaStream | null,
  isMuted: false,
  isVideoOff: false,
  remoteMuted: false,
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
};

export const useVideoChatStore = create<VideoChatStore>((set) => ({
  ...initialState,

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setMuted: (muted) => set({ isMuted: muted }),
  setVideoOff: (videoOff) => set({ isVideoOff: videoOff }),
  setRemoteMuted: (muted) => set({ remoteMuted: muted }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCallStartedAt: (timestamp) => set({ callStartedAt: timestamp }),
  addChatMessage: (message) =>
    set((s) => ({ chatMessages: [...s.chatMessages, message] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  setError: (error) => set({ error }),
  setPeerInfo: (peerInfo) => set({ peerInfo }),
  setOverlayPosition: (position) => set({ overlayPosition: position }),
  setOverlayCorner: (corner) => set({ overlayCorner: corner }),
  setFloatingMode: (isFloating) => set({ isFloatingMode: isFloating }),
  setFloatingPosition: (position) => set({ floatingPosition: position }),
  setFloatingCorner: (corner) => set({ floatingCorner: corner }),

  resetState: () => set(initialState),
  resetPeerState: () =>
    set({
      remoteStream: null,
      remoteMuted: false,
      chatMessages: [],
      connectionStatus: "idle",
      callStartedAt: null,
      error: null,
      peerInfo: null,
    }),
  resetRuntimeState: () =>
    set({
      localStream: null,
      remoteStream: null,
      remoteMuted: false,
      chatMessages: [],
      connectionStatus: "idle",
      callStartedAt: null,
      error: null,
      peerInfo: null,
      overlayPosition: null,
      overlayCorner: null,
      isFloatingMode: false,
      floatingPosition: null,
      floatingCorner: null,
    }),
}));
