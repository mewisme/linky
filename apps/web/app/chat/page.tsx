"use client";

import { useEffect, useRef, useState } from "react";

import { ChatSidebar } from "./_components/chat-sidebar";
import { Header } from "@/components/header";
import { VideoContainer } from "./_components/video-container";
import { useVideoChat } from "@/hooks/use-video-chat";

export default function ChatPage() {
  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isVideoOff,
    remoteMuted,
    chatMessages,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    error,
  } = useVideoChat();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const lastReadMessageCountRef = useRef(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const isInitialMountRef = useRef(true);

  // Track unread messages when sidebar is closed
  useEffect(() => {
    if (isChatOpen) {
      // When sidebar opens, mark all messages as read
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
    } else {
      // When sidebar is closed, check if there are new messages
      // On initial mount with sidebar closed, initialize the read count
      if (isInitialMountRef.current) {
        lastReadMessageCountRef.current = chatMessages.length;
        setHasUnreadMessages(false);
        isInitialMountRef.current = false;
        return;
      }

      const unreadCount = chatMessages.length - lastReadMessageCountRef.current;
      // Only show badge for messages from others (not own messages)
      const newMessages = chatMessages.slice(lastReadMessageCountRef.current);
      const hasNewMessagesFromOthers = newMessages.some((msg) => !msg.isOwn);
      setHasUnreadMessages(unreadCount > 0 && hasNewMessagesFromOthers);
    }
  }, [isChatOpen, chatMessages]);

  // Reset unread count when messages are cleared (e.g., peer disconnect)
  useEffect(() => {
    if (chatMessages.length === 0) {
      lastReadMessageCountRef.current = 0;
      setHasUnreadMessages(false);
    }
  }, [chatMessages.length]);

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-background to-muted">
      <Header connectionStatus={connectionStatus} />

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Error Message */}
        {error && (
          <p className="text-md text-destructive debug-red p-4 text-center w-full">{error}</p>
        )}

        {/* Video Container */}
        <VideoContainer
          localStream={localStream}
          remoteStream={remoteStream}
          connectionStatus={connectionStatus}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          remoteMuted={remoteMuted}
          isChatOpen={isChatOpen}
          hasUnreadMessages={hasUnreadMessages}
          onStart={start}
          onSkip={skip}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />
      </main>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatMessages={chatMessages}
        connectionStatus={connectionStatus}
        onSendMessage={sendMessage}
      />
    </div>
  );
}
