'use client'

import { Loader } from "@/shared/ui/loader";
import { cn } from "@ws/ui/lib/utils";

interface LoadingProps {
  title: string;
  size?: "sm" | "md" | "lg";
  height?: 'screen' | 'full' | number;
  width?: 'screen' | 'full' | number;
}

export function Loading({ title, size = "md", height = "screen", width = "screen" }: LoadingProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      height === "screen" ? "h-screen" : height === "full" ? "h-full" : height ? `h-[${height}px]` : '',
      width === "screen" ? "w-screen" : width === "full" ? "w-full" : width ? `w-[${width}px]` : ''
    )}>
      <Loader title={title} size={size} />
    </div>
  )
}
