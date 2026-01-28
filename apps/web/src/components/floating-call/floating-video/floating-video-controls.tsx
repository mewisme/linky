"use client";

import { useEffect, useRef } from "react";

import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import type { UsersAPI } from "@/types/users.types";
import { VideoControls } from "@/app/(app)/chat/components/video-controls";

interface FloatingVideoControlsProps {
  connectionStatus: ConnectionStatus;
  isInActiveCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  hasLocalStream: boolean;
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
  isVisible: boolean;
  isMobile: boolean;
}

export function FloatingVideoControls({
  connectionStatus,
  isInActiveCall,
  isMuted,
  isVideoOff,
  hasLocalStream,
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
  isVisible,
  isMobile,
}: FloatingVideoControlsProps) {
  const controlsWrapperRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking controls
    e.stopPropagation();
  };

  // Override VideoControls positioning to be absolute instead of fixed
  useEffect(() => {
    if (!controlsWrapperRef.current) return;
    const controlsDiv = controlsWrapperRef.current.querySelector("div");
    if (controlsDiv) {
      // Force absolute positioning instead of fixed
      controlsDiv.style.position = "absolute";
    }
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: "opacity 200ms ease-in-out",
      }}
    >
      <div
        ref={controlsWrapperRef}
        className="pointer-events-auto relative w-full"
        onClick={handleClick}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <VideoControls
          connectionStatus={connectionStatus}
          isInActiveCall={isInActiveCall}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          hasLocalStream={hasLocalStream}
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
