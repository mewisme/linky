"use client";

import type { ControlConfig, ControlContext } from "./video-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ws/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ws/ui/components/ui/tooltip";

import { Button } from "@ws/ui/components/ui/button";
import { IconDotsVertical } from "@tabler/icons-react";

export interface MoreOptionsMenuProps {
  controls: ControlConfig[];
  context: ControlContext;
  hasUnreadIndicator: boolean;
  onPeerInfoOpen: () => void;
  onReportOpen: () => void;
}

export function MoreOptionsMenu({
  controls,
  context,
  hasUnreadIndicator,
  onPeerInfoOpen,
  onReportOpen,
}: MoreOptionsMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>More options</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" side="top" className="mb-2">
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
            <DropdownMenuItem
              key={control.id}
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
              <Icon className="size-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
