"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useVideoChat } from "@/hooks/webrtc/use-video-chat";

// Expose only methods and computed values, not raw state
// Components should subscribe to Zustand directly for state
interface GlobalCallContextValue {
  // Computed values
  isInActiveCall: boolean;

  // Methods
  sendMessage: (message: string) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  clearError: () => void;
}

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

interface GlobalCallManagerProps {
  children: ReactNode;
}

export function GlobalCallManager({ children }: GlobalCallManagerProps) {
  const videoChat = useVideoChat();

  // Expose only methods and computed values to prevent context rerenders
  const contextValue = useMemo<GlobalCallContextValue>(() => ({
    isInActiveCall: videoChat.isInActiveCall,
    sendMessage: videoChat.sendMessage,
    start: videoChat.start,
    skip: videoChat.skip,
    endCall: videoChat.endCall,
    toggleMute: videoChat.toggleMute,
    toggleVideo: videoChat.toggleVideo,
    sendFavoriteNotification: videoChat.sendFavoriteNotification,
    clearError: videoChat.clearError,
  }), [
    videoChat.isInActiveCall,
    videoChat.sendMessage,
    videoChat.start,
    videoChat.skip,
    videoChat.endCall,
    videoChat.toggleMute,
    videoChat.toggleVideo,
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
