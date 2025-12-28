"use client";

import { Card, CardContent } from "@repo/ui/components/ui/card";
import { MicOff, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ConnectionStatus } from "@/hooks/use-video-chat";
import { DraggableVideoOverlay } from "./draggable-video-overlay";
import { VideoControls } from "./video-controls";
import { VideoPlayer } from "./video-player";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

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
  const [localVideoAspectRatio, setLocalVideoAspectRatio] = useState<number | null>(null);

  // Get aspect ratio from video track
  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.width && settings.height) {
          const aspectRatio = settings.width / settings.height;
          setLocalVideoAspectRatio(aspectRatio);
        } else {
          // Fallback to 16:9 if settings not available
          setLocalVideoAspectRatio(16 / 9);
        }
      }
    } else {
      setLocalVideoAspectRatio(null);
    }
  }, [localStream]);

  const hasPeer = !!remoteStream;

  return (
    <div className="relative flex flex-1 items-center justify-center p-0">
      <Card
        ref={containerRef}
        className="relative h-full w-full overflow-hidden bg-transparent"
        style={{ height: "calc(100vh - 3rem)" }}
      >
        <CardContent className="relative h-full w-full p-0">
          {isMobile ? (
            /* Mobile: Overlay view - Peer full screen, User overlay at top-right */
            hasPeer ? (
              <>
                {/* Peer Video - Main (Full Screen) */}
                <div className="relative h-full w-full">
                  <VideoPlayer
                    stream={remoteStream}
                    playsInline
                    aspectRatio="16/9"
                    className="h-full w-full"
                    objectFit="contain"
                    isMobile={isMobile}
                  />
                  {/* Remote Mute Indicator */}
                  {remoteMuted && (
                    <div className="absolute top-4 left-4 z-10 flex items-center justify-center rounded-full bg-black/60 p-2">
                      <MicOff className="size-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Local Video Overlay - Fixed at top-right corner */}
                {localStream && (
                  <div className="absolute top-4 right-4 z-20 w-32 overflow-hidden rounded-lg border-2 border-background shadow-lg">
                    <div
                      className="relative bg-black"
                      style={{
                        aspectRatio: localVideoAspectRatio ? `${localVideoAspectRatio}` : "16/9",
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
              /* Mobile: No peer - Show local video full screen */
              <>
                {localStream ? (
                  <div className="relative h-full w-full">
                    <VideoPlayer
                      stream={localStream}
                      muted
                      playsInline
                      aspectRatio={localVideoAspectRatio || 16 / 9}
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
            /* Desktop: Draggable overlay behavior */
            hasPeer ? (
              <>
                {/* Peer Video - Main */}
                <div className="relative h-full w-full">
                  <VideoPlayer
                    stream={remoteStream}
                    playsInline
                    aspectRatio="16/9"
                    className="h-full w-full"
                    objectFit="contain"
                    isMobile={isMobile}
                  />
                  {/* Remote Mute Indicator */}
                  {remoteMuted && (
                    <div className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full bg-black/60 p-2">
                      <MicOff className="size-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Local Video Overlay - Draggable */}
                <DraggableVideoOverlay
                  localStream={localStream}
                  isVideoOff={isVideoOff}
                  containerRef={containerRef as React.RefObject<HTMLDivElement>}
                />
              </>
            ) : (
              /* Desktop: No peer - Show local video in main */
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

          {/* Controls Overlay */}
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
        </CardContent>
      </Card>
    </div>
  );
}

