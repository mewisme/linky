"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { VideoOff } from "lucide-react";
import {
  useVideoChatStore,
  type OverlayCorner,
  type OverlayPosition,
} from "@/stores/video-chat-store";
import { VideoPlayer } from "./video-player";

interface DraggableVideoOverlayProps {
  localStream: MediaStream | null;
  isVideoOff: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  isMobile?: boolean;
}

function getDefaultCorner(isMobile: boolean): OverlayCorner {
  return isMobile ? "top-right" : "bottom-right";
}

const PADDING = 16;

const MOBILE_OVERLAY_WIDTH_VW = 30;
const MOBILE_OVERLAY_MAX_PX = 128;

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
  const corners: OverlayCorner[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ];
  let best: OverlayCorner = "bottom-right";
  let bestDistSq = Infinity;
  for (const c of corners) {
    const p = getCornerPosition(
      c,
      containerWidth,
      containerHeight,
      overlayWidth,
      overlayHeight
    );
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

export function DraggableVideoOverlay({
  localStream,
  isVideoOff,
  containerRef,
  isMobile = false,
}: DraggableVideoOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const latestPositionRef = useRef<OverlayPosition | null>(null);
  const hasInitializedPositionRef = useRef(false);
  const hasUserDraggedRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const position = useVideoChatStore((s) => s.overlayPosition);
  const positionRef = useRef<OverlayPosition | null>(null);
  positionRef.current = position;

  useLayoutEffect(() => {
    if (hasInitializedPositionRef.current) return;
    if (!containerRef.current || !overlayRef.current) return;
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const containerRect = container.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const defaultCorner = getDefaultCorner(isMobile);
    const cornerPos = getCornerPosition(
      defaultCorner,
      containerRect.width,
      containerRect.height,
      overlayRect.width,
      overlayRect.height
    );
    hasInitializedPositionRef.current = true;
    useVideoChatStore.getState().setOverlayPosition(cornerPos);
    useVideoChatStore.getState().setOverlayCorner(defaultCorner);
  }, [containerRef, isMobile]);

  useLayoutEffect(() => {
    if (!hasInitializedPositionRef.current || hasUserDraggedRef.current) return;
    if (positionRef.current === null || !containerRef.current || !overlayRef.current)
      return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const defaultCorner = getDefaultCorner(isMobile);
    const cornerPos = getCornerPosition(
      defaultCorner,
      containerRect.width,
      containerRect.height,
      overlayRect.width,
      overlayRect.height
    );
    useVideoChatStore.getState().setOverlayPosition(cornerPos);
    useVideoChatStore.getState().setOverlayCorner(defaultCorner);
  }, [containerRef, isMobile]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const pos = positionRef.current;
      if (!pos || !overlayRef.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const corner = hasUserDraggedRef.current
        ? getNearestCorner(
            pos.x + overlayRect.width / 2,
            pos.y + overlayRect.height / 2,
            containerRect.width,
            containerRect.height,
            overlayRect.width,
            overlayRect.height
          )
        : getDefaultCorner(isMobile);
      const next = getCornerPosition(
        corner,
        containerRect.width,
        containerRect.height,
        overlayRect.width,
        overlayRect.height
      );
      useVideoChatStore.getState().setOverlayPosition(next);
      useVideoChatStore.getState().setOverlayCorner(corner);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, isMobile]);

  const runSnapToNearestCorner = (override?: OverlayPosition) => {
    const pos = override ?? positionRef.current;
    if (!pos || !containerRef.current || !overlayRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const centerX = pos.x + overlayRect.width / 2;
    const centerY = pos.y + overlayRect.height / 2;
    const corner = getNearestCorner(
      centerX,
      centerY,
      containerRect.width,
      containerRect.height,
      overlayRect.width,
      overlayRect.height
    );
    const cornerPos = getCornerPosition(
      corner,
      containerRect.width,
      containerRect.height,
      overlayRect.width,
      overlayRect.height
    );
    useVideoChatStore.getState().setOverlayPosition(cornerPos);
    useVideoChatStore.getState().setOverlayCorner(corner);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !overlayRef.current || position === null)
      return;
    e.preventDefault();
    hasUserDraggedRef.current = true;
    const overlay = overlayRef.current;
    const pointerId = e.pointerId;
    overlay.setPointerCapture(pointerId);
    setIsDragging(true);
    latestPositionRef.current = position;
    const containerRect = containerRef.current.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - position.x;
    const offsetY = e.clientY - containerRect.top - position.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let newX = moveEvent.clientX - rect.left - offsetX;
      let newY = moveEvent.clientY - rect.top - offsetY;
      newX = Math.max(0, Math.min(newX, rect.width - overlayRect.width));
      newY = Math.max(0, Math.min(newY, rect.height - overlayRect.height));
      const next = { x: newX, y: newY };
      latestPositionRef.current = next;
      useVideoChatStore.getState().setOverlayPosition(next);
    };

    const handlePointerUp = () => {
      overlay.releasePointerCapture(pointerId);
      setIsDragging(false);
      runSnapToNearestCorner(latestPositionRef.current ?? undefined);
      overlay.removeEventListener("pointermove", handlePointerMove);
      overlay.removeEventListener("pointerup", handlePointerUp);
      overlay.removeEventListener("pointercancel", handlePointerUp);
    };

    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("pointercancel", handlePointerUp);
  };

  if (!localStream) return null;

  const transition = isDragging ? { duration: 0 } : springTransition;

  return (
    <motion.div
      ref={overlayRef}
      data-reaction-exclude
      className={`absolute left-0 top-0 z-10 ${isMobile ? "aspect-square" : "w-[200px] aspect-4/3"} cursor-move overflow-hidden rounded-lg border-2 border-background bg-black outline-none ring-0 touch-none select-none ${
        position === null ? "invisible" : ""
      }`}
      style={
        isMobile
          ? { width: `min(${MOBILE_OVERLAY_WIDTH_VW}vw, ${MOBILE_OVERLAY_MAX_PX}px)` }
          : undefined
      }
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
      <VideoPlayer
        stream={localStream}
        muted
        playsInline
        className="h-full w-full"
        objectFit="cover"
        objectPosition="center"
        isMobile={isMobile}
      />
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <VideoOff className="size-8 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}
