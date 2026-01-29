"use client";

import type { ControlConfig, ControlContext } from "./video-controls";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { useEffect, useState } from "react";

import { Button } from "@repo/ui/components/ui/button";
import { IconDotsVertical } from "@tabler/icons-react";

export interface MoreOptionsDrawerProps {
  controls: ControlConfig[];
  context: ControlContext;
  hasUnreadIndicator: boolean;
  onPeerInfoOpen: () => void;
  onReportOpen: () => void;
}

export function MoreOptionsDrawer({
  controls,
  context,
  hasUnreadIndicator,
  onPeerInfoOpen,
  onReportOpen,
}: MoreOptionsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const setOverlayZIndex = () => {
        const overlay = document.querySelector('[data-slot="drawer-overlay"]') as HTMLElement;
        if (overlay) {
          overlay.style.zIndex = "115";
        } else {
          requestAnimationFrame(setOverlayZIndex);
        }
      };
      requestAnimationFrame(setOverlayZIndex);
    }
  }, [isOpen]);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 ${hasUnreadIndicator ? "relative" : ""}`}
              data-testid="chat-overflow-menu-button"
            >
              <IconDotsVertical className="size-5" />
              {hasUnreadIndicator && (
                <span className="absolute right-1 top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                </span>
              )}
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>More options</p>
        </TooltipContent>
      </Tooltip>
      <DrawerContent className="z-120" style={{ zIndex: 120 }}>
        <DrawerHeader>
          <DrawerTitle>More Options</DrawerTitle>
        </DrawerHeader>
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-4 pb-8">
          {controls.map((control) => {
            const Icon = control.dynamicIcon?.(context) ?? control.icon;
            const label = control.dynamicLabel?.(context) ?? control.label;
            const isDisabled =
              typeof control.disabled === "boolean"
                ? control.disabled
                : control.disabled?.(context) ?? false;
            const testId =
              typeof control.testId === "function"
                ? control.testId(context)
                : control.testId;

            return (
              <DrawerClose key={control.id} asChild>
                <Button
                  variant="ghost"
                  className="h-12 w-full justify-start gap-3"
                  onClick={() => {
                    if (control.id === "peer-info") {
                      onPeerInfoOpen();
                    } else if (control.id === "report") {
                      onReportOpen();
                    } else {
                      control.onClick();
                    }
                  }}
                  disabled={isDisabled}
                  data-testid={testId}
                >
                  <Icon className="size-5" />
                  <span>{label}</span>
                </Button>
              </DrawerClose>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
