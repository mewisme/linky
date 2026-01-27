"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@repo/ui/components/ui/button";
import { IconMaximize } from "@tabler/icons-react";

interface ExpandOverlayProps {
  onExpand: () => void;
  isMobile: boolean;
  isDragging: boolean;
  isInteracting: boolean;
}

export function FloatingVideoOverlay({ onExpand, isMobile, isDragging, isInteracting }: ExpandOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const startHideTimer = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  };

  const handleMouseEnter = () => {
    if (!isMobile && !isDragging) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsVisible(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Allow button clicks to propagate
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // Ignore clicks that were part of a drag gesture
    if (isDragging || isInteracting) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    // Mobile: double-tap to expand
    if (isMobile) {
      if (timeSinceLastTap < 300) {
        tapCountRef.current += 1;

        if (tapCountRef.current === 2) {
          clearHideTimer();
          setIsVisible(false);
          tapCountRef.current = 0;
          onExpand();
          return;
        }
      } else {
        tapCountRef.current = 1;
      }

      lastTapRef.current = now;
      setIsVisible(true);
      startHideTimer();
    }
    // Desktop: single tap shows overlay (expand button is clickable separately)
    else {
      if (!isVisible) {
        setIsVisible(true);
        startHideTimer();
      }
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onExpand();
  };

  useEffect(() => {
    if (isDragging || isInteracting) {
      setIsVisible(false);
      clearHideTimer();
    }
  }, [isDragging, isInteracting]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {isVisible && !isDragging && !isInteracting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity animate-in fade-in duration-200">
          <Button
            variant="secondary"
            size={isMobile ? "sm" : "default"}
            onClick={handleExpandClick}
            className="gap-2 shadow-lg"
          >
            <IconMaximize className={isMobile ? "size-4" : "size-5"} />
            Expand
          </Button>
        </div>
      )}
    </div>
  );
}
