"use client";

import { Button } from "@ws/ui/components/ui/button";
import { IconMaximize } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("call.floating");
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onExpand();
  };

  const expandLabel = t("expandLabel");

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {isVisible && !isDragging && !isInteracting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity animate-in fade-in duration-200">
          <Button
            type="button"
            variant="ghost"
            size={isMobile ? "icon" : "default"}
            onClick={handleExpandClick}
            aria-label={expandLabel}
            title={expandLabel}
            className={
              isMobile
                ? "size-11 shrink-0 shadow-lg pointer-events-auto bg-black/40 text-white hover:bg-black/55 border border-white/15"
                : "gap-2 shadow-lg pointer-events-auto bg-black/40 text-white hover:bg-black/55 border border-white/15"
            }
          >
            <IconMaximize className={isMobile ? "size-5" : "size-5"} aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
