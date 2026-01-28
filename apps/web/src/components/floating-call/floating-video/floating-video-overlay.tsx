"use client";

import { Button } from "@repo/ui/components/ui/button";
import { IconMaximize } from "@tabler/icons-react";

interface ExpandOverlayProps {
  onExpand: () => void;
  isMobile: boolean;
  isDragging: boolean;
  isInteracting: boolean;
  isVisible: boolean;
}

export function FloatingVideoOverlay({
  onExpand,
  isMobile,
  isDragging,
  isInteracting,
  isVisible,
}: ExpandOverlayProps) {
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onExpand();
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {isVisible && !isDragging && !isInteracting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity animate-in fade-in duration-200">
          <Button
            variant="secondary"
            size={isMobile ? "sm" : "default"}
            onClick={handleExpandClick}
            className="gap-2 shadow-lg pointer-events-auto bg-black/40 text-white hover:bg-black/55 border border-white/15"
          >
            <IconMaximize className={isMobile ? "size-4" : "size-5"} />
            Restore full view
          </Button>
        </div>
      )}
    </div>
  );
}
