"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ws/ui/components/ui/alert-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@ws/ui/components/ui/button";
import { ReactionEffectProvider } from "@/components/providers/realtime/reaction-effect-provider";
import type { ResourcesAPI } from "@/types/resources.types";
import type { UsersAPI } from "@/types/users.types";
import { VideoContainer } from "./video-container";
import { useBlockUser } from "@/hooks/user/use-block-user";
import { useChatPanelStore } from "@/stores/chat-panel-store";
import { useChatUnreadIndicator } from "@/hooks/chat/use-chat-unread-indicator";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/components/providers/call/global-call-manager";
import { useUserContext } from "@/components/providers/user/user-provider";
import { useVideoChatStore } from "@/stores/video-chat-store";

interface ChatPageContentProps {
  initialProgress?: UsersAPI.Progress.GetMe.Response | null;
  initialFavorites?: ResourcesAPI.Favorites.Get.Response | null;
}

export function ChatPageContent({ initialProgress, initialFavorites }: ChatPageContentProps) {
  const { authLoading } = useUserContext();

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

  const {
    isInActiveCall,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    isSharingScreen,
    sendFavoriteNotification,
    clearError,
    isPassive,
  } = useGlobalCallContext();

  const { blockUser: handleBlockUser } = useBlockUser();

  const isChatOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const toggleChatPanel = useChatPanelStore((s) => s.toggleChatPanel);
  const openChatPanel = useChatPanelStore((s) => s.openChatPanel);
  const { hasUnreadMessages } = useChatUnreadIndicator(chatMessages, isChatOpen);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shouldOpen = searchParams.get("open_chat_panel") === "true";
    if (!shouldOpen) {
      return;
    }

    openChatPanel();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("open_chat_panel");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
  }, [openChatPanel, pathname, router, searchParams]);

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
            onToggleChat={toggleChatPanel}
            onToggleScreenShare={toggleScreenShare}
            isSharingScreen={isSharingScreen}
            onBlockUser={async (userId) => {
              await handleBlockUser(userId);
              endCall();
            }}
            sendFavoriteNotification={sendFavoriteNotification}
            isPassive={isPassive}
            initialProgress={initialProgress ?? undefined}
            initialFavorites={initialFavorites ?? undefined}
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
    </ReactionEffectProvider>
  );
}
