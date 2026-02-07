"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useVideoChat } from "@/hooks/webrtc/use-video-chat";
import type { ChatMessageDraft } from "@/types/chat-message.types";

interface GlobalCallContextValue {
  isInActiveCall: boolean;

  sendMessage: (draft: ChatMessageDraft) => void;
  sendTyping: (isTyping: boolean) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  isSharingScreen: boolean;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  clearError: () => void;
}

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

interface GlobalCallManagerProps {
  children: ReactNode;
}

export function GlobalCallManager({ children }: GlobalCallManagerProps) {
  const videoChat = useVideoChat();

  const contextValue = useMemo<GlobalCallContextValue>(() => ({
    isInActiveCall: videoChat.isInActiveCall,
    sendMessage: videoChat.sendMessage,
    sendTyping: videoChat.sendTyping,
    start: videoChat.start,
    skip: videoChat.skip,
    endCall: videoChat.endCall,
    toggleMute: videoChat.toggleMute,
    toggleVideo: videoChat.toggleVideo,
    toggleScreenShare: videoChat.toggleScreenShare,
    isSharingScreen: videoChat.isSharingScreen,
    sendFavoriteNotification: videoChat.sendFavoriteNotification,
    clearError: videoChat.clearError,
  }), [
    videoChat.isInActiveCall,
    videoChat.sendMessage,
    videoChat.sendTyping,
    videoChat.start,
    videoChat.skip,
    videoChat.endCall,
    videoChat.toggleMute,
    videoChat.toggleVideo,
    videoChat.toggleScreenShare,
    videoChat.isSharingScreen,
    videoChat.sendFavoriteNotification,
    videoChat.clearError,
  ]);

  return (
    <GlobalCallContext.Provider value={contextValue}>
      {children}
    </GlobalCallContext.Provider>
  );
}

export function useGlobalCallContext(): GlobalCallContextValue {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error("useGlobalCallContext must be used within GlobalCallManager");
  }
  return context;
}
