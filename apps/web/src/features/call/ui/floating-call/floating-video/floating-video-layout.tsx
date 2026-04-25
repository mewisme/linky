"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import type { ComponentProps } from "react";

import type { FloatingLayoutMode } from "./floating-video-state";
import { IconMicrophoneOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMirrorLocalPreview, VideoPlayer } from "@/features/chat/ui/video-player";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { Shader } from "@ws/ui/components/mew-ui/shader";
import { useShaderPreference } from "@/shared/hooks/use-shader-preference";

interface PeerInfo {
  first_name?: string | null;
  avatar_url?: string | null;
}

interface FloatingVideoLayoutProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteMuted: boolean;
  peerInfo: PeerInfo | null;
  isMobile: boolean;
  layoutMode: FloatingLayoutMode;
}

export function FloatingVideoLayout({
  localStream,
  remoteStream,
  remoteMuted,
  peerInfo,
  isMobile,
  layoutMode,
}: FloatingVideoLayoutProps) {
  const tp = useTranslations("user.profile");
  const shader = useShaderPreference();
  const isSharingScreen = useVideoChatStore((s) => s.isSharingScreen);
  const mirrorLocalPreview = useMirrorLocalPreview(localStream, isSharingScreen);
  const iconSize = isMobile ? "size-3" : "size-4";
  const padding = isMobile ? "p-1" : "p-1.5";
  let content: React.ReactNode = null;

  if (layoutMode === "dual") {
    content = (
      <div className="flex h-full w-full flex-col pointer-events-none rounded-[4px]">
        <div className="relative w-full overflow-hidden bg-black" style={{ flex: "0 0 60%" }}>
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
        <div className="relative w-full overflow-hidden bg-black" style={{ flex: "0 0 40%" }}>
          <VideoPlayer
            stream={localStream}
            muted
            playsInline
            className="h-full w-full"
            objectFit="cover"
            objectPosition="center center"
            mirrored={mirrorLocalPreview}
          />
        </div>
      </div>
    );
  }

  if (layoutMode === "single-remote") {
    content = (
      <div className="relative h-full w-full pointer-events-none rounded-[4px] bg-black">
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

  if (layoutMode === "single-local") {
    content = (
      <div className="relative h-full w-full pointer-events-none rounded-[4px] bg-black">
        <VideoPlayer
          stream={localStream}
          muted
          playsInline
          className="h-full w-full"
          objectFit="cover"
          objectPosition="center center"
          mirrored={mirrorLocalPreview}
        />
      </div>
    );
  }

  if (layoutMode === "avatar") {
    content = (
      <div className="relative flex h-full w-full items-center justify-center rounded-[4px] bg-muted pointer-events-none">
        {peerInfo ? (
          <Avatar className="h-full w-full rounded-none">
            <AvatarImage src={peerInfo.avatar_url || undefined} alt={peerInfo.first_name || tp("displayNameFallback")} className="object-cover" />
            <AvatarFallback className="h-full w-full text-4xl">{peerInfo.first_name?.[0]?.toUpperCase() || tp("displayNameInitial")}</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-full w-full rounded-none">
            <AvatarFallback className="h-full w-full text-4xl">{tp("displayNameInitial")}</AvatarFallback>
          </Avatar>
        )}
        {remoteMuted && (
          <div className={`absolute left-2 top-2 flex items-center justify-center rounded-full bg-black/60 ${padding}`}>
            <IconMicrophoneOff className={iconSize} />
          </div>
        )}
      </div>
    );
  }

  if (!content) {
    return null;
  }
  const floatingShaderProps = {
    type: shader.type,
    preset: shader.preset,
    disableAnimation: shader.disableAnimation,
    className: "pointer-events-none absolute inset-0 z-10",
  } as ComponentProps<typeof Shader>;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[4px]">
      <Shader {...floatingShaderProps} />
      <div className="absolute inset-[2px] z-20 overflow-hidden rounded-[4px] bg-black">
        {content}
      </div>
    </div>
  );
}
