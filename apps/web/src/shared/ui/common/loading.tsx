"use client";

import { RandomSpinner } from "@ws/ui/components/mew-ui/spinner";
import { cn } from "@ws/ui/lib/utils";

interface LoadingProps {
  size?: number;
  variant?: "screen" | "full";
}

export function Loading({
  size = 100,
  variant = "screen"
}: LoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variant === "screen" ? "h-screen w-screen" : "h-full w-full",
      )}
    >
      <RandomSpinner size={size} />
    </div>
  );
}
