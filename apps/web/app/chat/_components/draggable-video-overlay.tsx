"use client";

import { useEffect, useRef, useState } from "react";

import { VideoOff } from "lucide-react";
import { VideoPlayer } from "./video-player";

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface Position {
  x: number;
  y: number;
}

interface DraggableVideoOverlayProps {
  localStream: MediaStream | null;
  isVideoOff: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onPositionChange?: (position: Position, corner: CornerPosition | null) => void;
}

export function DraggableVideoOverlay({
  localStream,
  isVideoOff,
  containerRef,
  onPositionChange,
}: DraggableVideoOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localVideoPosition, setLocalVideoPosition] = useState<Position>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (containerRef.current && overlayRef.current) {
      const container = containerRef.current;
      const overlay = overlayRef.current;
      const containerRect = container.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const position = {
        x: containerRect.width - overlayRect.width - 16,
        y: containerRect.height - overlayRect.height - 16,
      };
      setLocalVideoPosition(position);
      onPositionChange?.(position, "bottom-right");
    }
  }, [containerRef, onPositionChange]);

  const getCornerPosition = (
    corner: CornerPosition,
    containerWidth: number,
    containerHeight: number,
    overlayWidth: number,
    overlayHeight: number
  ): Position => {
    const padding = 16;
    switch (corner) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: containerWidth - overlayWidth - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: containerHeight - overlayHeight - padding };
      case "bottom-right":
        return {
          x: containerWidth - overlayWidth - padding,
          y: containerHeight - overlayHeight - padding,
        };
    }
  };

  const checkMagneticSnap = (
    pos: Position,
    containerWidth: number,
    containerHeight: number,
    overlayWidth: number,
    overlayHeight: number
  ): CornerPosition | null => {
    const snapThreshold = 50; // pixels
    const corners: CornerPosition[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    for (const corner of corners) {
      const cornerPos = getCornerPosition(
        corner,
        containerWidth,
        containerHeight,
        overlayWidth,
        overlayHeight
      );
      const distance = Math.sqrt(
        Math.pow(pos.x - cornerPos.x, 2) + Math.pow(pos.y - cornerPos.y, 2)
      );
      if (distance < snapThreshold) {
        return corner;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !overlayRef.current) return;

    setIsDragging(true);
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const containerRect = container.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const startX = e.clientX - containerRect.left - localVideoPosition.x;
    const startY = e.clientY - containerRect.top - localVideoPosition.y;

    let currentPos = { ...localVideoPosition };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const containerRect = container.getBoundingClientRect();
      const newX = moveEvent.clientX - containerRect.left - startX;
      const newY = moveEvent.clientY - containerRect.top - startY;

      const constrainedX = Math.max(
        0,
        Math.min(newX, containerRect.width - overlayRect.width)
      );
      const constrainedY = Math.max(
        0,
        Math.min(newY, containerRect.height - overlayRect.height)
      );

      currentPos = { x: constrainedX, y: constrainedY };
      setLocalVideoPosition(currentPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      const containerRect = container.getBoundingClientRect();
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      if (!overlayRect) return;

      const snapped = checkMagneticSnap(
        currentPos,
        containerRect.width,
        containerRect.height,
        overlayRect.width,
        overlayRect.height
      );

      if (snapped) {
        const cornerPos = getCornerPosition(
          snapped,
          containerRect.width,
          containerRect.height,
          overlayRect.width,
          overlayRect.height
        );
        setLocalVideoPosition(cornerPos);
        onPositionChange?.(cornerPos, snapped);
      } else {
        onPositionChange?.(currentPos, null);
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (!localStream) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      className={`absolute z-10 cursor-move transition-transform outline-none ring-0 ${isDragging ? "scale-105" : "scale-100"} rounded-lg p-1 bg-accent`}
      style={{
        left: `${localVideoPosition.x}px`,
        top: `${localVideoPosition.y}px`,
        width: "200px",
        height: "150px",
      }}
    >
      <VideoPlayer
        stream={localStream}
        muted
        playsInline
        className="h-full w-full"
        objectFit="cover"
        isMobile={false}
      />
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <VideoOff className="size-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

