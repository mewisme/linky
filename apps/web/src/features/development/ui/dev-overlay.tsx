"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconCode, IconConfetti, IconHandClick, IconMessageCircleCode, IconTrophy } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LEVEL_UP_BURST_REACTIONS, STREAK_BURST_REACTION } from "@/shared/lib/reaction-display-type";
import { useDevelopmentStore } from "@/shared/model/development-store";
import { useReactionEffectContext } from "@/providers/realtime/reaction-effect-provider";
import { Button } from "@ws/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ws/ui/components/ui/popover";

const OVERLAY_SIZE = 44;
const VIEWPORT_PADDING = 12;

function clampPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { x, y };
  }
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - OVERLAY_SIZE - VIEWPORT_PADDING);
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - OVERLAY_SIZE - VIEWPORT_PADDING);
  return {
    x: Math.min(Math.max(VIEWPORT_PADDING, x), maxX),
    y: Math.min(Math.max(VIEWPORT_PADDING, y), maxY),
  };
}

function getDefaultPosition() {
  if (typeof window === "undefined") {
    return { x: VIEWPORT_PADDING, y: VIEWPORT_PADDING };
  }
  return clampPosition(window.innerWidth - OVERLAY_SIZE - 24, window.innerHeight - OVERLAY_SIZE - 24);
}

export function DevOverlay() {
  const t = useTranslations("development.devOverlay");
  const overlayRef = useRef<HTMLButtonElement>(null);
  const draggingRef = useRef(false);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isDevelopmentModeEnabled = useDevelopmentStore((state) => state.isDevelopmentModeEnabled);
  const overlayPosition = useDevelopmentStore((state) => state.overlayPosition);
  const setOverlayPosition = useDevelopmentStore((state) => state.setOverlayPosition);
  const resetOverlayPosition = useDevelopmentStore((state) => state.resetOverlayPosition);
  const { triggerLocalReaction, emitReaction, triggerRemoteReactions } = useReactionEffectContext();

  const setVisualPosition = (position: { x: number; y: number }) => {
    const node = overlayRef.current;
    if (!node) {
      return;
    }
    node.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  };

  useLayoutEffect(() => {
    if (!isDevelopmentModeEnabled || overlayPosition) {
      return;
    }
    setOverlayPosition(getDefaultPosition());
  }, [isDevelopmentModeEnabled, overlayPosition, setOverlayPosition]);

  useEffect(() => {
    if (!isDevelopmentModeEnabled || !overlayPosition) {
      return;
    }

    const handleResize = () => {
      const next = clampPosition(overlayPosition.x, overlayPosition.y);
      if (next.x !== overlayPosition.x || next.y !== overlayPosition.y) {
        setOverlayPosition(next);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isDevelopmentModeEnabled, overlayPosition, setOverlayPosition]);

  useEffect(() => {
    if (!overlayPosition || draggingRef.current) {
      return;
    }
    dragPositionRef.current = overlayPosition;
    setVisualPosition(overlayPosition);
  }, [overlayPosition]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (!isDevelopmentModeEnabled || !overlayPosition) {
    return null;
  }

  const displayPosition = overlayPosition;

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const node = overlayRef.current;
    if (!node) {
      return;
    }

    event.preventDefault();
    const pointerId = event.pointerId;
    const start = dragPositionRef.current ?? overlayPosition;
    const offsetX = event.clientX - start.x;
    const offsetY = event.clientY - start.y;
    let hasMoved = false;

    node.setPointerCapture(pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    dragPositionRef.current = start;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const next = clampPosition(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
      if (!hasMoved && (Math.abs(next.x - start.x) > 1 || Math.abs(next.y - start.y) > 1)) {
        hasMoved = true;
      }
      dragPositionRef.current = next;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (dragPositionRef.current) {
          setVisualPosition(dragPositionRef.current);
        }
      });
    };

    const cleanup = () => {
      draggingRef.current = false;
      setIsDragging(false);
      if (hasMoved && dragPositionRef.current) {
        suppressClickRef.current = true;
        setOverlayPosition(dragPositionRef.current);
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      node.releasePointerCapture(pointerId);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerup", cleanup);
      node.removeEventListener("pointercancel", cleanup);
    };

    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerup", cleanup);
    node.addEventListener("pointercancel", cleanup);
  };

  const triggerStreakBurst = () => {
    triggerRemoteReactions(1, STREAK_BURST_REACTION, "burst");
  };

  const triggerLevelUpBurst = () => {
    triggerRemoteReactions(1, LEVEL_UP_BURST_REACTIONS, "burst");
  };

  const triggerDoubleTapReaction = () => {
    const position = dragPositionRef.current ?? overlayPosition;
    const centerX = position.x + OVERLAY_SIZE / 2;
    const centerY = position.y + OVERLAY_SIZE / 2;
    triggerLocalReaction({ x: centerX, y: centerY }, "heart", "single");
    emitReaction(1, "heart", "single");
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-160">
        <Popover>
          <PopoverTrigger render={
            <Button
              ref={overlayRef}
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t("triggerAriaLabel")}
              className="pointer-events-auto fixed rounded-full shadow-lg touch-none"
              style={{
                width: OVERLAY_SIZE,
                height: OVERLAY_SIZE,
                left: 0,
                top: 0,
                transform: `translate3d(${overlayPosition.x}px, ${overlayPosition.y}px, 0)`,
                willChange: "transform",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onPointerDown={handlePointerDown}
              onClick={(event) => {
                if (suppressClickRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  suppressClickRef.current = false;
                }
              }}
            >
              <IconCode className="size-5" />
            </Button>
          } />
          <PopoverContent className="z-170 w-80 p-3" align="start" sideOffset={12}>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("positionLabel", {
                    x: Math.round(displayPosition.x),
                    y: Math.round(displayPosition.y),
                  })}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant="outline" className="justify-start gap-2" onClick={triggerStreakBurst}>
                  <IconConfetti className="size-4" />
                  {t("triggerStreakBurst")}
                </Button>
                <Button type="button" variant="outline" className="justify-start gap-2" onClick={triggerLevelUpBurst}>
                  <IconTrophy className="size-4" />
                  {t("triggerLevelUpBurst")}
                </Button>
                <Button type="button" variant="outline" className="justify-start gap-2" onClick={triggerDoubleTapReaction}>
                  <IconHandClick className="size-4" />
                  {t("triggerDoubleTap")}
                </Button>
                <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => setIsDialogOpen(true)}>
                  <IconMessageCircleCode className="size-4" />
                  {t("openDialog")}
                </Button>
                <Button type="button" variant="ghost" className="justify-start" onClick={resetOverlayPosition}>
                  {t("resetPosition")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="z-175">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setIsDialogOpen(false)}>
              {t("dialogClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
