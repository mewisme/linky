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

import { Button } from "@repo/ui/components/ui/button";
import { ChatSidebar } from "./components/chat-sidebar";
import { ReactionEffectProvider } from "@/components/providers/realtime/reaction-effect-provider";
import { VideoContainer } from "./components/video-container";
import { useGlobalCallContext } from "@/components/providers/call/global-call-manager";
import { useUserContext } from "@/components/providers/user/user-provider";
import { useVideoChatStore } from "@/stores/video-chat-store";

export default function ChatPage() {
  const { authLoading } = useUserContext();

  // Subscribe to Zustand state directly to minimize rerenders
  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isMuted = useVideoChatStore((s) => s.isMuted);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const error = useVideoChatStore((s) => s.error);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  // Get only methods from context (these don't cause rerenders)
  const {
    isInActiveCall,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    sendFavoriteNotification,
    clearError,
  } = useGlobalCallContext();

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

  const handleRestoreFullUI = () => {
    useVideoChatStore.getState().setFloatingMode(false);
  };

  return (
    <ReactionEffectProvider>
      <main className="relative flex flex-1 flex-col overflow-hidden h-full">
        <AlertDialog open={!!error && !authLoading} onOpenChange={(open) => !open && clearError()}>
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

        {!isFloatingMode && (
          <VideoContainer
            localStream={localStream}
            remoteStream={remoteStream}
            connectionStatus={connectionStatus}
            isInActiveCall={isInActiveCall}
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
            sendFavoriteNotification={sendFavoriteNotification}
          />
        )}

        {isFloatingMode && isInActiveCall && (
          <div className="flex h-[calc(100dvh-16rem)] w-full flex-col items-center justify-center gap-4">
            <p className="text-lg text-muted-foreground">Call is minimized</p>
            <Button onClick={handleRestoreFullUI} size="lg">
              Restore Full View
            </Button>
          </div>
        )}
      </main>

      {!isFloatingMode && (
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          chatMessages={chatMessages}
          connectionStatus={connectionStatus}
          onSendMessage={sendMessage}
        />
      )}
    </ReactionEffectProvider>
  );
}
