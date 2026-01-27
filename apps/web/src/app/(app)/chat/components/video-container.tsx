"use client";

import { IconMicrophoneOff, IconVideoOff } from "@tabler/icons-react";
import { useCallback, useRef } from "react";

import { CallTimer } from "./call-timer";
import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import { ReactionOverlay } from "./overlays/reaction-overlay";
import type { UsersAPI } from "@/types/users.types";
import { VideoChatIdleState } from "./video-chat-idle-state";
import { VideoChatSearchingState } from "./video-chat-searching-state";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useMousePosition } from "@/hooks/ui/use-mouse-move";
import { useReactionTrigger } from "@/hooks/webrtc/use-reaction-trigger";
import { useStreamAspectRatio } from "@/hooks/webrtc/use-stream-aspect-ratio";
import { useViewportHeight } from "@/hooks/ui/use-viewport-height";

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
  onToggleChat: () => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
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
  onToggleChat,
  sendFavoriteNotification,
}: VideoContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
  const tapCaptureRef = useRef<HTMLDivElement>(null);
  const [mousePosition, mousePositionRef] = useMousePosition<HTMLDivElement>();
  const isMobile = useIsMobile();
  const hasPeer = !!remoteStream;
  const remoteAspectRatio = useStreamAspectRatio(remoteStream);
  const localAspectRatio = useStreamAspectRatio(localStream);
  const containerHeight = useViewportHeight(64);

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
        handleTap(x, y);
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
        mousePositionRef.current = node;
      }
    },
    [mousePositionRef]
  );

  const displayAspectRatio = hasPeer ? remoteAspectRatio : localAspectRatio;

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
            <VideoPlayer
              stream={remoteStream}
              playsInline
              aspectRatio={displayAspectRatio ?? undefined}
              className="h-full w-full"
              objectFit="contain"
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
          <ReactionOverlay containerRef={containerRef} />

          <DraggableVideoOverlay
            localStream={localStream}
            isVideoOff={isVideoOff}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            isMobile={isMobile}
          />
        </>
      ) : (
        <>
          {connectionStatus === "searching" || connectionStatus === "connecting" ? (
            <VideoChatSearchingState />
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
          ) : connectionStatus === "idle" ? (
            <VideoChatIdleState onStart={onStart} />
          ) : (
            <div className="h-full w-full" />
          )}
        </>
      )}

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
          onToggleChat={onToggleChat}
          sendFavoriteNotification={sendFavoriteNotification}
        />
      </div>
    </div>
  );
}

