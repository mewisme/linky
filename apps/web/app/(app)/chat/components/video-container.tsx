"use client";

import { MicOff, VideoOff } from "lucide-react";

import type { ConnectionStatus } from "@/hooks/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import type { UsersAPI } from "@/types/users.types";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useRef } from "react";
import { useStreamAspectRatio } from "@/hooks/use-stream-aspect-ratio";
import { useViewportHeight } from "@/hooks/use-viewport-height";

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
}: VideoContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const hasPeer = !!remoteStream;
  const remoteAspectRatio = useStreamAspectRatio(remoteStream);
  const localAspectRatio = useStreamAspectRatio(localStream);
  const containerHeight = useViewportHeight(64);

  const displayAspectRatio = hasPeer ? remoteAspectRatio : localAspectRatio;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-transparent"
      style={{ height: `${containerHeight}px` }}
    >
      {hasPeer ? (
        <>
          <div className="relative flex h-full w-full items-center justify-center">
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
      />
    </div>
  );
}

