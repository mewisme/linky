"use client";

import { MicOff, VideoOff } from "lucide-react";

import type { ConnectionStatus } from "@/hooks/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useRef } from "react";

interface VideoContainerProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
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

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-transparent mt-20"
      style={{ height: "calc(100dvh - 6rem)" }}
    >
      {isMobile ? (
        hasPeer ? (
          <>
            <div className="relative h-full w-full">
              <VideoPlayer
                stream={remoteStream}
                playsInline
                aspectRatio="16/9"
                className="h-full w-full"
                objectFit="contain"
                isMobile={isMobile}
              />
              {remoteMuted && (
                <div className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-full bg-black/60 p-2">
                  <MicOff className="size-5 text-white" />
                </div>
              )}
            </div>

            {localStream && (
              <div className="absolute top-4 right-4 z-20 w-32 overflow-hidden rounded-lg border-2 border-background shadow-lg">
                <div
                  className="relative bg-black"
                  style={{
                    aspectRatio: "1/1",
                  }}
                >
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
            )}
          </>
        ) : (
          <>
            {localStream ? (
              <div className="relative h-full w-full">
                <VideoPlayer
                  stream={localStream}
                  muted
                  playsInline
                  aspectRatio="1/1"
                  className="h-full w-full"
                  objectFit="contain"
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <div className="flex h-[calc(100dvh-200px)]" />
            )}

            {isVideoOff && localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="size-12 text-muted-foreground" />
              </div>
            )}
          </>
        )
      ) : (
        hasPeer ? (
          <>
            <div className="relative h-full w-full">
              <VideoPlayer
                stream={remoteStream}
                playsInline
                aspectRatio="16/9"
                className="h-full w-full"
                objectFit="contain"
                isMobile={isMobile}
              />
              {remoteMuted && (
                <div className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full bg-black/60 p-2">
                  <MicOff className="size-5 text-white" />
                </div>
              )}
            </div>

            <DraggableVideoOverlay
              localStream={localStream}
              isVideoOff={isVideoOff}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
            />
          </>
        ) : (
          <>
            {localStream ? (
              <div className="relative h-full w-full">
                <VideoPlayer
                  stream={localStream}
                  muted
                  playsInline
                  aspectRatio="16/9"
                  className="h-full w-full"
                  objectFit="contain"
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <div className="flex h-[calc(100dvh-200px)]" />
            )}

            {isVideoOff && localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="size-12 text-muted-foreground" />
              </div>
            )}
          </>
        )
      )}

      <VideoControls
        connectionStatus={connectionStatus}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        hasLocalStream={!!localStream}
        isChatOpen={isChatOpen}
        hasUnreadMessages={hasUnreadMessages}
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

