"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { VideoContainer } from "@/features/chat/ui/video-container";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { ReactionEffectProvider } from "@/providers/realtime/reaction-effect-provider";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";
import { useChatUnreadIndicator } from "@/features/chat/hooks/use-chat-unread-indicator";
import { useBlockUser } from "@/features/user/hooks/use-block-user";

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (pathname === "/call/chat") {
      useVideoChatStore.getState().setFloatingMode(true);
    } else {
      useVideoChatStore.getState().setFloatingMode(false);
    }
  }, [pathname]);

  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isMuted = useVideoChatStore((s) => s.isMuted);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);
  const callInitialProgress = useVideoChatStore((s) => s.callInitialProgress);
  const callInitialFavorites = useVideoChatStore((s) => s.callInitialFavorites);

  const {
    isInActiveCall,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    swapCamera,
    toggleScreenShare,
    isSharingScreen,
    sendFavoriteNotification,
    isPassive,
  } = useGlobalCallContext();

  const { blockUser: handleBlockUser } = useBlockUser();
  const isChatOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const toggleChatPanel = useChatPanelStore((s) => s.toggleChatPanel);
  const { hasUnreadMessages } = useChatUnreadIndicator(chatMessages, isChatOpen);

  const handleToggleChat = isMobile
    ? () => router.push("/call/chat")
    : toggleChatPanel;

  const showInlineVideo =
    pathname === "/call" && !isFloatingMode;

  return (
    <ReactionEffectProvider>
      <main className="relative flex flex-1 flex-col overflow-hidden h-full">
        {showInlineVideo && (
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
          onToggleChat={handleToggleChat}
          onSwapCamera={swapCamera}
          onToggleScreenShare={toggleScreenShare}
          isSharingScreen={isSharingScreen}
          onBlockUser={async (userId) => {
            await handleBlockUser(userId);
            endCall();
          }}
          sendFavoriteNotification={sendFavoriteNotification}
          isPassive={isPassive}
          initialProgress={callInitialProgress ?? undefined}
          initialFavorites={callInitialFavorites ?? undefined}
        />
        )}
        {children}
      </main>
    </ReactionEffectProvider>
  );
}
