"use client";

import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { FloatingVideoLayout } from "./floating-video-layout";
import { FloatingVideoControls } from "./floating-video-controls";
import { getFloatingVideoMetrics } from "./floating-video-metrics";
import { deriveFloatingLayoutMode } from "./floating-video-state";
import { useVideoChatStore, type OverlayCorner, type OverlayPosition } from "@/stores/video-chat-store";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import type { UsersAPI } from "@/types/users.types";

const PADDING = 16;
const DRAG_THRESHOLD = 10;
const DRAG_TIME_THRESHOLD = 200;

function getDefaultCorner(isMobile: boolean): OverlayCorner {
  return isMobile ? "top-right" : "bottom-right";
}

function getCornerPosition(
  corner: OverlayCorner,
  containerWidth: number,
  containerHeight: number,
  overlayWidth: number,
  overlayHeight: number
): OverlayPosition {
  switch (corner) {
    case "top-left":
      return { x: PADDING, y: PADDING };
    case "top-right":
      return { x: containerWidth - overlayWidth - PADDING, y: PADDING };
    case "bottom-left":
      return { x: PADDING, y: containerHeight - overlayHeight - PADDING };
    case "bottom-right":
      return {
        x: containerWidth - overlayWidth - PADDING,
        y: containerHeight - overlayHeight - PADDING,
      };
  }
}

function getNearestCorner(
  overlayCenterX: number,
  overlayCenterY: number,
  containerWidth: number,
  containerHeight: number,
  overlayWidth: number,
  overlayHeight: number
): OverlayCorner {
  const corners: OverlayCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
  let best: OverlayCorner = "bottom-right";
  let bestDistSq = Infinity;
  for (const c of corners) {
    const p = getCornerPosition(c, containerWidth, containerHeight, overlayWidth, overlayHeight);
    const cx = p.x + overlayWidth / 2;
    const cy = p.y + overlayHeight / 2;
    const dSq = (overlayCenterX - cx) ** 2 + (overlayCenterY - cy) ** 2;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = c;
    }
  }
  return best;
}

function getAspectRatioClass(layoutMode: string): string {
  switch (layoutMode) {
    case "dual":
      return "aspect-[320/457]";
    case "single-remote":
    case "single-local":
      return "aspect-4/3";
    case "avatar":
      return "aspect-square";
    default:
      return "aspect-4/3";
  }
}

const springTransition = {
  type: "spring" as const,
  stiffness: 250,
  damping: 28,
};

interface FloatingVideoContainerProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoOff: boolean;
  remoteMuted: boolean;
  peerInfo: UsersAPI.PublicUserInfo | null;
  hasAudioActivity?: boolean;
  connectionStatus: ConnectionStatus;
  isInActiveCall: boolean;
  isMuted: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
  onStart: () => void;
  onSkip: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleChat: () => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  onNavigateToChat: () => void;
}

export function FloatingVideoContainer({
  localStream,
  remoteStream,
  isVideoOff,
  remoteMuted,
  peerInfo,
  hasAudioActivity = false,
  connectionStatus,
  isInActiveCall,
  isMuted,
  isChatOpen,
  hasUnreadMessages,
  onStart,
  onSkip,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  sendFavoriteNotification,
  onNavigateToChat,
}: FloatingVideoContainerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const latestPositionRef = useRef<OverlayPosition | null>(null);
  const hasInitializedPositionRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragStartedRef = useRef(false);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [dragPosition, setDragPosition] = useState<OverlayPosition | null>(null);
  const dragPositionRef = useRef<OverlayPosition | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

  const position = useVideoChatStore((s) => s.floatingPosition);
  const remoteCameraEnabled = useVideoChatStore((s) => s.remoteCameraEnabled);
  const positionRef = useRef<OverlayPosition | null>(null);
  positionRef.current = position;

  const isRemoteCameraOn = !!remoteStream && remoteCameraEnabled;
  const isLocalCameraOn = !isVideoOff;

  const layoutMode = useMemo(
    () => deriveFloatingLayoutMode(isRemoteCameraOn, isLocalCameraOn),
    [isRemoteCameraOn, isLocalCameraOn]
  );

  const metrics = useMemo(
    () => getFloatingVideoMetrics({ isMobile, layoutMode }),
    [isMobile, layoutMode]
  );

  const { width, maxHeightVh } = metrics;

  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const handleTap = () => {
    if (isMobile) {
      onNavigateToChat();
    }
  };

  const handleMouseEnter = () => {
    if (isMobile || isDragging) return;
    clearHideTimer();
    setIsControlsVisible(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    clearHideTimer();
    setIsControlsVisible(false);
  };

  useLayoutEffect(() => {
    if (hasInitializedPositionRef.current) return;
    if (!overlayRef.current) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const defaultCorner = getDefaultCorner(isMobile);
    const actualWidth = overlayRef.current.offsetWidth;
    const actualHeight = overlayRef.current.offsetHeight;
    const cornerPos = getCornerPosition(
      defaultCorner,
      containerWidth,
      containerHeight,
      actualWidth,
      actualHeight
    );

    hasInitializedPositionRef.current = true;
    useVideoChatStore.getState().setFloatingPosition(cornerPos);
    useVideoChatStore.getState().setFloatingCorner(defaultCorner);
  }, [isMobile, layoutMode]);

  useLayoutEffect(() => {
    const pos = positionRef.current;
    if (!pos || !overlayRef.current) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const actualWidth = overlayRef.current.offsetWidth;
    const actualHeight = overlayRef.current.offsetHeight;

    const next = {
      x: Math.max(0, Math.min(pos.x, containerWidth - actualWidth)),
      y: Math.max(0, Math.min(pos.y, containerHeight - actualHeight)),
    };

    if (next.x !== pos.x || next.y !== pos.y) {
      useVideoChatStore.getState().setFloatingPosition(next);
    }
  }, [layoutMode]);

  useLayoutEffect(() => {
    const handleResize = () => {
      const pos = positionRef.current;
      if (!pos || !overlayRef.current) return;

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const actualWidth = overlayRef.current.offsetWidth;
      const actualHeight = overlayRef.current.offsetHeight;

      const centerX = pos.x + actualWidth / 2;
      const centerY = pos.y + actualHeight / 2;

      const corner = getNearestCorner(
        centerX,
        centerY,
        containerWidth,
        containerHeight,
        actualWidth,
        actualHeight
      );

      const next = getCornerPosition(corner, containerWidth, containerHeight, actualWidth, actualHeight);
      useVideoChatStore.getState().setFloatingPosition(next);
      useVideoChatStore.getState().setFloatingCorner(corner);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [layoutMode]);

  const runSnapToNearestCorner = (override?: OverlayPosition) => {
    const pos = override ?? positionRef.current;
    if (!pos || !overlayRef.current) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const actualWidth = overlayRef.current.offsetWidth;
    const actualHeight = overlayRef.current.offsetHeight;

    const centerX = pos.x + actualWidth / 2;
    const centerY = pos.y + actualHeight / 2;

    const corner = getNearestCorner(
      centerX,
      centerY,
      containerWidth,
      containerHeight,
      actualWidth,
      actualHeight
    );

    const cornerPos = getCornerPosition(corner, containerWidth, containerHeight, actualWidth, actualHeight);
    useVideoChatStore.getState().setFloatingPosition(cornerPos);
    useVideoChatStore.getState().setFloatingCorner(corner);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current || position === null) return;

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="button"]')) {
      return;
    }

    e.stopPropagation();

    const overlay = overlayRef.current;
    const pointerId = e.pointerId;
    overlay.setPointerCapture(pointerId);

    dragDistanceRef.current = 0;
    dragStartedRef.current = false;
    dragStartTimeRef.current = Date.now();
    startPositionRef.current = { x: e.clientX, y: e.clientY };
    latestPositionRef.current = position;
    setIsInteracting(true);

    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!startPositionRef.current) return;

      const dx = moveEvent.clientX - startPositionRef.current.x;
      const dy = moveEvent.clientY - startPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      dragDistanceRef.current = distance;

      const timeSinceStart = Date.now() - dragStartTimeRef.current;
      const shouldStartDrag = distance > DRAG_THRESHOLD || timeSinceStart > DRAG_TIME_THRESHOLD;

      if (shouldStartDrag && !dragStartedRef.current) {
        dragStartedRef.current = true;
        setIsDragging(true);
      }

      if (dragStartedRef.current) {
        let newX = moveEvent.clientX - offsetX;
        let newY = moveEvent.clientY - offsetY;

        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;

        const actualWidth = overlayRef.current?.offsetWidth || 0;
        const actualHeight = overlayRef.current?.offsetHeight || 0;
        newX = Math.max(0, Math.min(newX, containerWidth - actualWidth));
        newY = Math.max(0, Math.min(newY, containerHeight - actualHeight));

        const next = { x: newX, y: newY };
        latestPositionRef.current = next;
        dragPositionRef.current = next;

        if (rafIdRef.current === null) {
          setDragPosition(next);
          rafIdRef.current = requestAnimationFrame(() => {
            if (dragPositionRef.current) {
              setDragPosition(dragPositionRef.current);
            }
            rafIdRef.current = null;
          });
        }
      }
    };

    const handlePointerUp = () => {
      overlay.releasePointerCapture(pointerId);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const wasDrag = dragStartedRef.current || dragDistanceRef.current > DRAG_THRESHOLD;

      if (wasDrag) {
        const finalPos = latestPositionRef.current ?? dragPosition;
        if (finalPos) {
          setDragPosition(finalPos);
          useVideoChatStore.getState().setFloatingPosition(finalPos);
        }
        runSnapToNearestCorner(finalPos ?? undefined);
      } else {
        handleTap();
      }

      setIsDragging(false);
      setIsInteracting(false);
      setDragPosition(null);
      dragPositionRef.current = null;
      dragStartedRef.current = false;
      dragDistanceRef.current = 0;
      startPositionRef.current = null;
      dragStartTimeRef.current = 0;

      overlay.removeEventListener("pointermove", handlePointerMove);
      overlay.removeEventListener("pointerup", handlePointerUp);
      overlay.removeEventListener("pointercancel", handlePointerUp);
    };

    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("pointercancel", handlePointerUp);
  };

  const transition = isDragging ? { duration: 0 } : springTransition;

  useEffect(() => {
    if (!isDragging && !isInteracting) return;
    if (isMobile) return;
    clearHideTimer();
    setIsControlsVisible(false);
  }, [isDragging, isInteracting, isMobile]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  const aspectRatioClass = getAspectRatioClass(layoutMode);

  return (
    <motion.div
      ref={overlayRef}
      className={`fixed left-0 top-0 overflow-hidden rounded-lg border-2 bg-black shadow-2xl touch-none select-none ${hasAudioActivity ? "border-green-500 shadow-green-500/50 shadow-lg" : "border-border"
        } ${position === null ? "invisible" : ""} ${aspectRatioClass}`}
      style={{
        zIndex: 40,
        width,
        ...(maxHeightVh ? { maxHeight: `${maxHeightVh}vh` } : {}),
        ...(isDragging ? { willChange: "transform" } : {}),
      }}
      animate={
        dragPosition || position
          ? {
            x: (dragPosition ?? position)!.x,
            y: (dragPosition ?? position)!.y,
            scale: isDragging ? 1.05 : 1,
          }
          : { x: 0, y: 0, scale: 1 }
      }
      transition={isDragging ? { duration: 0 } : transition}
      initial={false}
      onPointerDown={handlePointerDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <FloatingVideoLayout
        localStream={localStream}
        remoteStream={remoteStream}
        remoteMuted={remoteMuted}
        peerInfo={peerInfo}
        isMobile={isMobile}
        layoutMode={layoutMode}
      />
      {!isMobile && (
        <FloatingVideoControls
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
          isVisible={isControlsVisible}
          isMobile={false}
        />
      )}
    </motion.div>
  );
}
