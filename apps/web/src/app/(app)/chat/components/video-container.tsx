"use client";

import { MicOff, VideoOff } from "lucide-react";
import { useCallback, useRef } from "react";

import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import { HeartOverlay } from "./heart-overlay";
import type { UsersAPI } from "@/types/users.types";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useHeartReaction } from "@/hooks/webrtc/use-heart-reaction";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useMousePosition } from "@/hooks/ui/use-mouse-move";
import { useStreamAspectRatio } from "@/hooks/webrtc/use-stream-aspect-ratio";
import { useViewportHeight } from "@/hooks/ui/use-viewport-height";

interface VideoContainerProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
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

  const isActive = hasPeer && connectionStatus === "connected";

  const { handleTap } = useHeartReaction({
    isActive,
  });

  const handleTapCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isActive || !containerRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('[data-heart-exclude]') ||
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
    >
      {hasPeer ? (
        <>
          <div
            ref={tapCaptureRef}
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleTapCapture}
          />
          <div
            ref={remoteVideoContainerRef}
            className="relative flex h-full w-full items-center justify-center"
          >
            <VideoPlayer
              stream={remoteStream}
              playsInline
              aspectRatio={displayAspectRatio ?? undefined}
              className="max-h-full max-w-full"
              objectFit="contain"
              isMobile={isMobile}
            />
            {remoteMuted && (
              <div
                className={`absolute z-10 flex items-center justify-center rounded-full bg-black/60 p-2 ${isMobile ? "top-4 left-4" : "top-4 right-4"}`}
              >
                <MicOff className="size-5 text-white" />
              </div>
            )}
          </div>
          <HeartOverlay containerRef={containerRef} />

          {isMobile ? (
            localStream && (
              <div className="absolute top-4 right-4 z-20 w-32 overflow-hidden rounded-lg border-2 border-background shadow-lg">
                <div className="relative bg-black" style={{ aspectRatio: localAspectRatio ?? 1 }}>
                  <VideoPlayer
                    stream={localStream}
                    muted
                    playsInline
                    className="h-full w-full"
                    objectFit="cover"
                    isMobile={isMobile}
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <VideoOff className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <DraggableVideoOverlay
              localStream={localStream}
              isVideoOff={isVideoOff}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
            />
          )}
        </>
      ) : (
        <>
          {localStream ? (
            <div className="relative flex h-full w-full items-center justify-center">
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
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full" />
          )}
        </>
      )}

      <div data-heart-exclude className="relative" style={{ zIndex: 110 }}>
        <VideoControls
          connectionStatus={connectionStatus}
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

