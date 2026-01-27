"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { IconMicrophoneOff, IconVideoOff } from "@tabler/icons-react";

import { VideoPlayer } from "@/app/(app)/chat/components/video-player";

interface PeerInfo {
  first_name?: string | null;
  avatar_url?: string | null;
}

interface VideoLayoutProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoOff: boolean;
  remoteMuted: boolean;
  peerInfo: PeerInfo | null;
  isMobile: boolean;
}

export function FloatingVideoLayout({
  localStream,
  remoteStream,
  isVideoOff,
  remoteMuted,
  peerInfo,
  isMobile,
}: VideoLayoutProps) {
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled);
  const hasLocalVideo = localStream && !isVideoOff && localStream.getVideoTracks().some((t) => t.enabled);
  const showBothVideos = hasRemoteVideo && hasLocalVideo;
  const showRemoteOnly = hasRemoteVideo && !hasLocalVideo;
  const showLocalOnly = !hasRemoteVideo && hasLocalVideo;
  const showAvatar = !hasRemoteVideo && !hasLocalVideo;

  const gap = isMobile ? "gap-0.5" : "gap-1";
  const iconSize = isMobile ? "size-3" : "size-4";
  const padding = isMobile ? "p-1" : "p-1.5";

  if (showBothVideos) {
    return (
      <div className={`flex h-full w-full flex-col ${gap} pointer-events-none`}>
        <div className="relative flex-1 overflow-hidden bg-black">
          <VideoPlayer
            stream={remoteStream}
            playsInline
            className="h-full w-full"
            objectFit="cover"
            objectPosition="center center"
          />
          {remoteMuted && (
            <div className={`absolute left-2 top-2 flex items-center justify-center rounded-full bg-black/60 ${padding}`}>
              <IconMicrophoneOff className={iconSize} />
            </div>
          )}
        </div>
        <div className="relative flex-1 overflow-hidden bg-black">
          <VideoPlayer
            stream={localStream}
            muted
            playsInline
            className="h-full w-full"
            objectFit="cover"
            objectPosition="center center"
          />
        </div>
      </div>
    );
  }

  if (showRemoteOnly) {
    return (
      <div className="relative h-full w-full pointer-events-none bg-black">
        <VideoPlayer
          stream={remoteStream}
          playsInline
          className="h-full w-full"
          objectFit="cover"
          objectPosition="center center"
        />
        {remoteMuted && (
          <div className={`absolute left-2 top-2 flex items-center justify-center rounded-full bg-black/60 ${padding}`}>
            <IconMicrophoneOff className={iconSize} />
          </div>
        )}
      </div>
    );
  }

  if (showLocalOnly) {
    return (
      <div className="relative h-full w-full pointer-events-none bg-black">
        <VideoPlayer
          stream={localStream}
          muted
          playsInline
          className="h-full w-full"
          objectFit="cover"
          objectPosition="center center"
        />
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <IconVideoOff className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  if (showAvatar && peerInfo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted pointer-events-none">
        <Avatar className="h-16 w-16">
          <AvatarImage src={peerInfo.avatar_url || undefined} alt={peerInfo.first_name || "User"} />
          <AvatarFallback>{peerInfo.first_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        {remoteMuted && (
          <div className={`absolute left-2 top-2 flex items-center justify-center rounded-full bg-black/60 ${padding}`}>
            <IconMicrophoneOff className={iconSize} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted pointer-events-none">
      <Avatar className="h-16 w-16">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </div>
  );
}
