"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { FloatingVideoContainer } from "./floating-video";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useAudioActivity } from "@/features/call/hooks/webrtc/use-audio-activity";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";

interface FloatingCallProviderProps {
  children: ReactNode;
}

export function FloatingCallProvider({ children }: FloatingCallProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnCallPage = pathname === "/call";

  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);

  const { isInActiveCall } = useGlobalCallContext();

  const hasAudioActivity = useAudioActivity(remoteStream);

  useEffect(() => {
    if (isOnCallPage) {
      return;
    }

    if (!isInActiveCall) {
      const currentFloatingMode = useVideoChatStore.getState().isFloatingMode;
      if (currentFloatingMode) {
        useVideoChatStore.getState().setFloatingMode(false);
      }
    }
  }, [isInActiveCall, isOnCallPage]);

  const shouldShowFloating = isInActiveCall && !isOnCallPage;

  const handleExpand = () => {
    if (isOnCallPage) {
      useVideoChatStore.getState().setFloatingMode(false);
    } else {
      router.push("/call");
    }
  };

  return (
    <>
      {children}
      {shouldShowFloating && (
        <FloatingVideoContainer
          localStream={localStream}
          remoteStream={remoteStream}
          remoteMuted={remoteMuted}
          peerInfo={peerInfo}
          hasAudioActivity={hasAudioActivity}
          onNavigateToChat={handleExpand}
        />
      )}
    </>
  );
}
