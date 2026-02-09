import type { ComponentProps, HTMLAttributes } from "react";

import { Badge } from "@ws/ui/components/ui/badge";
import { cn } from "@ws/ui/lib/utils";

export type StatusProps = ComponentProps<typeof Badge> & {
  status: "online" | "offline" | "available" | "matching" | "in_call" | "idle";
};

export const Status = ({ className, status, ...props }: StatusProps) => (
  <Badge
    className={cn("flex items-center gap-2", "group", status, className)}
    variant="secondary"
    {...props}
  />
);

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({
  className,
  ...props
}: StatusIndicatorProps) => (
  <span className="relative flex h-2 w-2" {...props}>
    <span
      className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.available]:bg-blue-500",
        "group-[.matching]:bg-amber-500",
        "group-[.in_call]:bg-purple-500",
        "group-[.idle]:bg-gray-500"
      )}
    />
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.available]:bg-blue-500",
        "group-[.matching]:bg-amber-500",
        "group-[.in_call]:bg-purple-500",
        "group-[.idle]:bg-gray-500"
      )}
    />
  </span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({
  className,
  children,
  ...props
}: StatusLabelProps) => (
  <span className={cn("text-muted-foreground", className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">Online</span>
        <span className="hidden group-[.offline]:block">Offline</span>
        <span className="hidden group-[.available]:block">Available</span>
        <span className="hidden group-[.matching]:block">Matching</span>
        <span className="hidden group-[.in_call]:block">In Call</span>
        <span className="hidden group-[.idle]:block">Idle</span>
      </>
    )}
  </span>
);
