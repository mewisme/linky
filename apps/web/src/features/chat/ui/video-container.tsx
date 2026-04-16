"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { IconMicrophoneOff, IconVideoOff } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CallTimer } from "./call-timer";
import { ConnectionQualityIndicator } from "./connection-quality-indicator";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import { PassiveTabBanner } from "./passive-tab-banner";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { VideoChatIdleState } from "./video-chat-idle-state";
import { VideoChatSearchingState } from "./video-chat-searching-state";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { useMousePosition } from "@/shared/hooks/ui/use-mouse-move";
import { useQueryClient } from "@ws/ui/internal-lib/react-query";
import { useReactionTrigger } from "@/features/call/hooks/webrtc/use-reaction-trigger";
import { useStreamAspectRatio } from "@/features/call/hooks/webrtc/use-stream-aspect-ratio";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useViewportHeight } from "@/shared/hooks/ui/use-viewport-height";

interface VideoContainerProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  isInActiveCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
  peerInfo: UsersAPI.PublicUserInfo | null;
  onStart: () => void;
  onSkip: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwapCamera?: () => void;
  onToggleChat: () => void;
  onToggleScreenShare?: () => void;
  isSharingScreen?: boolean;
  onBlockUser?: (userId: string) => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  isPassive?: boolean;
  initialProgress?: UsersAPI.Progress.GetMe.Response;
  initialFavorites?: ResourcesAPI.Favorites.Get.Response;
}

export function VideoContainer({
  localStream,
  remoteStream,
  connectionStatus,
  isInActiveCall,
  isMuted,
  isVideoOff,
  remoteMuted,
  isChatOpen,
  hasUnreadMessages,
  peerInfo,
  onStart,
  onSkip,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSwapCamera,
  onToggleChat,
  onToggleScreenShare,
  isSharingScreen,
  onBlockUser,
  sendFavoriteNotification,
  isPassive = false,
  initialProgress,
  initialFavorites,
}: VideoContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  const tapCaptureRef = useRef<HTMLDivElement>(null);
  const [mousePosition, mousePositionRef] = useMousePosition<HTMLDivElement>();
  const isMobile = useIsMobile();
  const hasPeer = isInActiveCall;
  const remoteAspectRatio = useStreamAspectRatio(remoteStream);
  const localAspectRatio = useStreamAspectRatio(localStream);
  const containerHeight = useViewportHeight(64);

  const networkQuality = useVideoChatStore((s) => s.networkQuality);
  const isVideoStalled = useVideoChatStore((s) => s.isVideoStalled);
  const remoteCameraEnabled = useVideoChatStore((s) => s.remoteCameraEnabled);

  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (connectionStatus === "ended") {
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
    }
  }, [connectionStatus, queryClient]);

  const isRemoteCameraOn = !!remoteStream && remoteCameraEnabled && !isVideoStalled;
  const isLocalCameraOn = !isVideoOff;

  const isActive = isInActiveCall;

  const { handleTap } = useReactionTrigger({
    isActive,
  });

  const handleTapCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive || !containerRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('[data-reaction-exclude]') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      const x = mousePosition.elementX ?? 0;
      const y = mousePosition.elementY ?? 0;

      if (x > 0 && y > 0) {
        handleTap(e.clientX, e.clientY);
      }
    },
    [isActive, handleTap, mousePosition]
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof mousePositionRef === "function") {
        mousePositionRef(node);
      } else if (mousePositionRef) {
        // eslint-disable-next-line react-hooks/immutability
        mousePositionRef.current = node;
      }
    },
    [mousePositionRef]
  );

  const displayAspectRatio =
    remoteStream && hasPeer ? remoteAspectRatio : localAspectRatio;

  const showPassiveBanner = isPassive && connectionStatus !== "idle";
  if (showPassiveBanner) {
    return (
      <div
        className="relative w-full overflow-hidden bg-transparent"
        style={{ height: `${containerHeight}px` }}
        data-testid="chat-video-container-passive"
      >
        <PassiveTabBanner />
      </div>
    );
  }

  return (
    <div
      ref={setContainerRef}
      className="relative w-full overflow-hidden bg-transparent"
      style={{ height: `${containerHeight}px` }}
      data-testid="chat-video-container"
    >
      {hasPeer ? (
        <>
          <div
            ref={tapCaptureRef}
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleTapCapture}
          />
          <CallTimer isInActiveCall={isInActiveCall} />
          <div
            ref={remoteVideoContainerRef}
            className="relative flex h-full w-full items-center justify-center"
            style={{
              minHeight: '100%',
              minWidth: '100%',
              maxHeight: '100%',
              maxWidth: '100%'
            }}
            data-testid="chat-remote-video"
          >
            {isRemoteCameraOn ? (
              <VideoPlayer
                stream={remoteStream}
                playsInline
                aspectRatio={displayAspectRatio ?? undefined}
                className="h-full w-full"
                objectFit="contain"
                isMobile={isMobile}
              />
            ) : (
              <div
                className="relative flex h-full w-full items-center justify-center bg-muted"
                style={{
                  aspectRatio: displayAspectRatio ?? undefined,
                }}
              >
                {peerInfo ? (
                  <Avatar className="h-32 w-32 sm:h-40 sm:w-40">
                    <AvatarImage src={peerInfo.avatar_url || undefined} alt={peerInfo.first_name || "User"} className="object-cover" />
                    <AvatarFallback className="text-4xl sm:text-5xl">{peerInfo.first_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-32 w-32 sm:h-40 sm:w-40">
                    <AvatarFallback className="text-4xl sm:text-5xl">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
            <ConnectionQualityIndicator
              networkQuality={networkQuality}
              isVideoStalled={isVideoStalled}
              isMobile={isMobile}
            />
            {remoteMuted && (
              <div
                className={`absolute z-10 flex items-center justify-center rounded-full bg-black/60 p-2 ${isMobile ? "top-4 left-4" : "top-4 right-4"}`}
              >
                <IconMicrophoneOff className="size-5 text-white" />
              </div>
            )}
          </div>
          {isLocalCameraOn && (
            <DraggableVideoOverlay
              localStream={localStream}
              isVideoOff={isVideoOff}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              isMobile={isMobile}
            />
          )}
        </>
      ) : (
        <>
          {connectionStatus === "searching" ? (
            <VideoChatSearchingState progress={initialProgress} onEndCall={onEndCall} />
          ) : localStream ? (
            <div className="relative flex h-full w-full items-center justify-center" data-testid="chat-local-video">
              <VideoPlayer
                stream={localStream}
                muted
                playsInline
                aspectRatio={displayAspectRatio ?? undefined}
                className="max-h-full max-w-full"
                objectFit="contain"
                isMobile={isMobile}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted" data-testid="chat-camera-off-indicator">
                  <IconVideoOff className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>
          ) : connectionStatus === "idle" || connectionStatus === "ended" ? (
            <VideoChatIdleState
              onStart={onStart}
              onEndCall={onEndCall}
              connectionStatus={connectionStatus}
              initialProgress={initialProgress}
            />
          ) : (
            <div className="h-full w-full" />
          )}
        </>
      )}

      {isMounted &&
        (connectionStatus === "matched" ||
          connectionStatus === "in_call" ||
          connectionStatus === "reconnecting") && (
          <div data-reaction-exclude className="relative" style={{ zIndex: 110 }}>
            <VideoControls
              connectionStatus={connectionStatus}
              isInActiveCall={isInActiveCall}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              hasLocalStream={!!localStream}
              isChatOpen={isChatOpen}
              hasUnreadMessages={hasUnreadMessages}
              peerInfo={peerInfo}
              onStart={onStart}
              onSkip={onSkip}
              onEndCall={onEndCall}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onSwapCamera={onSwapCamera}
              onToggleChat={onToggleChat}
              onToggleScreenShare={onToggleScreenShare}
              isSharingScreen={isSharingScreen}
              onBlockUser={onBlockUser}
              sendFavoriteNotification={sendFavoriteNotification}
              initialFavorites={initialFavorites}
            />
          </div>
        )}
    </div>
  );
}

