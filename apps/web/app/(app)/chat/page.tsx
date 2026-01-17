"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import { useEffect, useRef, useState } from "react";

import { ChatSidebar } from "./components/chat-sidebar";
import { VideoContainer } from "./components/video-container";
import { useVideoChat } from "@/hooks/webrtc/use-video-chat";

export default function ChatPage() {
  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isVideoOff,
    remoteMuted,
    chatMessages,
    peerInfo,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    error,
    clearError,
  } = useVideoChat();

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

  return (
    <>
      <main className="relative flex flex-1 flex-col overflow-hidden h-full">
        <AlertDialog open={!!error} onOpenChange={(open) => !open && clearError()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>{error}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={clearError}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <VideoContainer
          localStream={localStream}
          remoteStream={remoteStream}
          connectionStatus={connectionStatus}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          remoteMuted={remoteMuted}
          isChatOpen={isChatOpen}
          hasUnreadMessages={hasUnreadMessages}
          peerInfo={peerInfo}
          onStart={start}
          onSkip={skip}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />
      </main>

      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatMessages={chatMessages}
        connectionStatus={connectionStatus}
        onSendMessage={sendMessage}
      />
    </>
  );
}
