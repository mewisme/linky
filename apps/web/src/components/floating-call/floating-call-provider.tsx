"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { FloatingVideoContainer } from "./floating-video";
import { useVideoChatStore } from "@/stores/video-chat-store";
import { useAudioActivity } from "@/hooks/webrtc/use-audio-activity";

interface FloatingCallProviderProps {
  children: ReactNode;
}

export function FloatingCallProvider({ children }: FloatingCallProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnChatPage = pathname === "/chat";
  const previousPathnameRef = useRef<string | null>(null);

  const localStream = useVideoChatStore((s) => s.localStream);
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isVideoOff = useVideoChatStore((s) => s.isVideoOff);
  const remoteMuted = useVideoChatStore((s) => s.remoteMuted);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  const isInActiveCall =
    !!remoteStream && (connectionStatus === "connected" || connectionStatus === "reconnecting");

  const hasAudioActivity = useAudioActivity(remoteStream);

  useEffect(() => {
    const previousPath = previousPathnameRef.current;
    const wasOnChatPage = previousPath === "/chat";
    const nowOnChatPage = isOnChatPage;

    if (wasOnChatPage && !nowOnChatPage && isInActiveCall) {
      useVideoChatStore.getState().setFloatingMode(true);
    }

    if (!wasOnChatPage && nowOnChatPage && isFloatingMode) {
      useVideoChatStore.getState().setFloatingMode(false);
    }

    previousPathnameRef.current = pathname;
  }, [pathname, isOnChatPage, isInActiveCall, isFloatingMode]);

  useEffect(() => {
    if (!isInActiveCall && isFloatingMode) {
      useVideoChatStore.getState().setFloatingMode(false);
    }
  }, [isInActiveCall, isFloatingMode]);

  const shouldShowFloating = isFloatingMode && isInActiveCall;

  const handleExpand = () => {
    if (isOnChatPage) {
      useVideoChatStore.getState().setFloatingMode(false);
    } else {
      router.push("/chat");
    }
  };

  return (
    <>
      {children}
      {shouldShowFloating && (
        <FloatingVideoContainer
          localStream={localStream}
          remoteStream={remoteStream}
          isVideoOff={isVideoOff}
          remoteMuted={remoteMuted}
          peerInfo={peerInfo}
          hasAudioActivity={hasAudioActivity}
          onExpand={handleExpand}
        />
      )}
    </>
  );
}
