"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { FloatingVideoLayout } from "./floating-video-layout";
import { FloatingVideoOverlay } from "./floating-video-overlay";
import { useVideoChatStore, type OverlayCorner, type OverlayPosition } from "@/stores/video-chat-store";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

const PADDING = 16;
const DESKTOP_WIDTH = 320;
const DESKTOP_HEIGHT = 240;
const MOBILE_WIDTH = 180;
const MOBILE_HEIGHT = 180;
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
  peerInfo: { first_name?: string | null; avatar_url?: string | null } | null;
  hasAudioActivity?: boolean;
  onExpand: () => void;
}

export function FloatingVideoContainer({
  localStream,
  remoteStream,
  isVideoOff,
  remoteMuted,
  peerInfo,
  hasAudioActivity = false,
  onExpand,
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
  const isMobile = useIsMobile();

  const position = useVideoChatStore((s) => s.floatingPosition);
  const positionRef = useRef<OverlayPosition | null>(null);
  positionRef.current = position;

  const overlayWidth = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const overlayHeight = isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT;

  useLayoutEffect(() => {
    if (hasInitializedPositionRef.current) return;
    if (!overlayRef.current) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const defaultCorner = getDefaultCorner(isMobile);
    const cornerPos = getCornerPosition(
      defaultCorner,
      containerWidth,
      containerHeight,
      overlayWidth,
      overlayHeight
    );

    hasInitializedPositionRef.current = true;
    useVideoChatStore.getState().setFloatingPosition(cornerPos);
    useVideoChatStore.getState().setFloatingCorner(defaultCorner);
  }, [isMobile, overlayWidth, overlayHeight]);

  useLayoutEffect(() => {
    const handleResize = () => {
      const pos = positionRef.current;
      if (!pos) return;

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      const centerX = pos.x + overlayWidth / 2;
      const centerY = pos.y + overlayHeight / 2;

      const corner = getNearestCorner(
        centerX,
        centerY,
        containerWidth,
        containerHeight,
        overlayWidth,
        overlayHeight
      );

      const next = getCornerPosition(corner, containerWidth, containerHeight, overlayWidth, overlayHeight);
      useVideoChatStore.getState().setFloatingPosition(next);
      useVideoChatStore.getState().setFloatingCorner(corner);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [overlayWidth, overlayHeight]);

  const runSnapToNearestCorner = (override?: OverlayPosition) => {
    const pos = override ?? positionRef.current;
    if (!pos) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    const centerX = pos.x + overlayWidth / 2;
    const centerY = pos.y + overlayHeight / 2;

    const corner = getNearestCorner(
      centerX,
      centerY,
      containerWidth,
      containerHeight,
      overlayWidth,
      overlayHeight
    );

    const cornerPos = getCornerPosition(corner, containerWidth, containerHeight, overlayWidth, overlayHeight);
    useVideoChatStore.getState().setFloatingPosition(cornerPos);
    useVideoChatStore.getState().setFloatingCorner(corner);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current || position === null) return;

    // Prevent drag when clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }

    e.preventDefault();
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

        newX = Math.max(0, Math.min(newX, containerWidth - overlayWidth));
        newY = Math.max(0, Math.min(newY, containerHeight - overlayHeight));

        const next = { x: newX, y: newY };
        latestPositionRef.current = next;
        useVideoChatStore.getState().setFloatingPosition(next);
      }
    };

    const handlePointerUp = () => {
      overlay.releasePointerCapture(pointerId);

      const wasDrag = dragDistanceRef.current > DRAG_THRESHOLD;

      if (wasDrag) {
        runSnapToNearestCorner(latestPositionRef.current ?? undefined);
      }

      setIsDragging(false);
      setIsInteracting(false);
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

  return (
    <motion.div
      ref={overlayRef}
      className={`fixed left-0 top-0 overflow-hidden rounded-lg border-2 bg-black shadow-2xl touch-none select-none ${hasAudioActivity ? "border-green-500 shadow-green-500/50 shadow-lg" : "border-border"
        } ${position === null ? "invisible" : ""}`}
      style={{
        width: overlayWidth,
        height: overlayHeight,
        zIndex: 40,
      }}
      animate={
        position
          ? {
            x: position.x,
            y: position.y,
            scale: isDragging ? 1.05 : 1,
          }
          : { x: 0, y: 0, scale: 1 }
      }
      transition={transition}
      initial={false}
      onPointerDown={handlePointerDown}
    >
      <FloatingVideoLayout
        localStream={localStream}
        remoteStream={remoteStream}
        isVideoOff={isVideoOff}
        remoteMuted={remoteMuted}
        peerInfo={peerInfo}
        isMobile={isMobile}
      />
      <FloatingVideoOverlay
        onExpand={onExpand}
        isMobile={isMobile}
        isDragging={isDragging}
        isInteracting={isInteracting}
      />
    </motion.div>
  );
}
