"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FloatingVideoContainer } from "./floating-video";
import { useVideoChatStore } from "@/stores/video-chat-store";
import { useAudioActivity } from "@/hooks/webrtc/use-audio-activity";
import { useGlobalCallContext } from "@/components/providers/call/global-call-manager";

interface FloatingCallProviderProps {
  children: ReactNode;
}

export function FloatingCallProvider({ children }: FloatingCallProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnChatPage = pathname === "/chat";
  const previousPathnameRef = useRef<string | null>(null);

  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isMuted = useVideoChatStore((s) => s.isMuted);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);
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

  // Track chat open state for unread messages
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lastReadMessageCountRef = useRef(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isChatOpen) {
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
    } else {
      if (isInitialMountRef.current) {
        lastReadMessageCountRef.current = chatMessages.length;
        setHasUnreadMessages(false);
        isInitialMountRef.current = false;
        return;
      }

      const unreadCount = chatMessages.length - lastReadMessageCountRef.current;
      const newMessages = chatMessages.slice(lastReadMessageCountRef.current);
      const hasNewMessagesFromOthers = newMessages.some((msg) => !msg.isOwn);
      setHasUnreadMessages(unreadCount > 0 && hasNewMessagesFromOthers);
    }
  }, [isChatOpen, chatMessages]);

  useEffect(() => {
    if (chatMessages.length === 0) {
      lastReadMessageCountRef.current = 0;
      setHasUnreadMessages(false);
    }
  }, [chatMessages.length]);

  useEffect(() => {
    const previousPath = previousPathnameRef.current;
    const wasOnChatPage = previousPath === "/chat";
    const nowOnChatPage = isOnChatPage;

    if (wasOnChatPage && !nowOnChatPage && isInActiveCall) {
      useVideoChatStore.getState().setFloatingMode(true);
    }

    if (!wasOnChatPage && nowOnChatPage && isFloatingMode) {
      useVideoChatStore.getState().setFloatingMode(false);
    }

    previousPathnameRef.current = pathname;
  }, [pathname, isOnChatPage, isInActiveCall, isFloatingMode]);

  useEffect(() => {
    if (!isInActiveCall && isFloatingMode) {
      useVideoChatStore.getState().setFloatingMode(false);
    }
  }, [isInActiveCall, isFloatingMode]);

  const shouldShowFloating = isFloatingMode && isInActiveCall;

  const handleExpand = () => {
    if (isOnChatPage) {
      useVideoChatStore.getState().setFloatingMode(false);
    } else {
      router.push("/chat");
    }
  };

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
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          sendFavoriteNotification={sendFavoriteNotification}
          onNavigateToChat={handleExpand}
        />
      )}
    </>
  );
}
