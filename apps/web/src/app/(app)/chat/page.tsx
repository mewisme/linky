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

import { Button } from "@repo/ui/components/ui/button";
import { ReactionEffectProvider } from "@/components/providers/realtime/reaction-effect-provider";
import { VideoContainer } from "./components/video-container";
import { useBlockUser } from "@/hooks/user/use-block-user";
import { useChatPanelStore } from "@/stores/chat-panel-store";
import { useChatUnreadIndicator } from "@/hooks/chat/use-chat-unread-indicator";
import { useGlobalCallContext } from "@/components/providers/call/global-call-manager";
import { useUserContext } from "@/components/providers/user/user-provider";
import { useVideoChatStore } from "@/stores/video-chat-store";

export default function ChatPage() {
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
  } = useGlobalCallContext();

  const { blockUser: handleBlockUser } = useBlockUser();

  const isChatOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const toggleChatPanel = useChatPanelStore((s) => s.toggleChatPanel);
  const { hasUnreadMessages } = useChatUnreadIndicator(chatMessages, isChatOpen);

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
