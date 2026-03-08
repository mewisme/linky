"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { FloatingVideoContainer } from "./floating-video";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useAudioActivity } from "@/features/call/hooks/webrtc/use-audio-activity";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useChatUnreadIndicator } from "@/features/chat/hooks/use-chat-unread-indicator";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";

interface FloatingCallProviderProps {
  children: ReactNode;
}

export function FloatingCallProvider({ children }: FloatingCallProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isOnCallPage = pathname === "/call";

  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isMuted = useVideoChatStore((s) => s.isMuted);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const chatMessages = useVideoChatStore((s) => s.chatMessages);

  const {
    isInActiveCall,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    sendFavoriteNotification,
  } = useGlobalCallContext();

  const hasAudioActivity = useAudioActivity(remoteStream);

  const isChatOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const toggleChatPanel = useChatPanelStore((s) => s.toggleChatPanel);
  const { hasUnreadMessages } = useChatUnreadIndicator(chatMessages, isChatOpen);

  useEffect(() => {
    if (isOnCallPage) {
      return;
    }

    if (!isInActiveCall) {
      const currentFloatingMode = useVideoChatStore.getState().isFloatingMode;
      if (currentFloatingMode) {
        useVideoChatStore.getState().setFloatingMode(false);
      }
    }
  }, [isInActiveCall, isOnCallPage]);

  const shouldShowFloating = isInActiveCall && !isOnCallPage;

  const handleExpand = () => {
    if (isOnCallPage) {
      useVideoChatStore.getState().setFloatingMode(false);
    } else {
      router.push("/call");
    }
  };

  const handleToggleChat = isMobile
    ? () => router.push("/call/chat")
    : toggleChatPanel;

  return (
    <>
      {children}
      {shouldShowFloating && (
        <FloatingVideoContainer
          localStream={localStream}
          remoteStream={remoteStream}
          isVideoOff={isVideoOff}
          remoteMuted={remoteMuted}
          peerInfo={peerInfo}
          hasAudioActivity={hasAudioActivity}
          connectionStatus={connectionStatus}
          isInActiveCall={isInActiveCall}
          isMuted={isMuted}
          isChatOpen={isChatOpen}
          hasUnreadMessages={hasUnreadMessages}
          onStart={start}
          onSkip={skip}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleChat={handleToggleChat}
          sendFavoriteNotification={sendFavoriteNotification}
          onNavigateToChat={handleExpand}
        />
      )}
    </>
  );
}
