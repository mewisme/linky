"use client";

import { IconAlertTriangle, IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { NetworkQuality } from "@/features/call/lib/webrtc/network-monitor";

interface ConnectionQualityIndicatorProps {
  networkQuality: NetworkQuality;
  isVideoStalled: boolean;
  isMobile?: boolean;
}

export function ConnectionQualityIndicator({
  networkQuality,
  isVideoStalled,
  isMobile = false,
}: ConnectionQualityIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [displayState, setDisplayState] = useState<"warning" | "critical" | "hidden">("hidden");

  useEffect(() => {
    const isGood = networkQuality === "excellent" || networkQuality === "good";
    const isPoor = networkQuality === "poor";
    const isCritical = networkQuality === "critical";

    if (isCritical || isVideoStalled) {
      setDisplayState("critical");
      setVisible(true);
    } else if (isPoor) {
      setDisplayState("warning");
      setVisible(true);
    } else if (isGood) {
      setVisible(false);
      const timeoutId = setTimeout(() => {
        setDisplayState("hidden");
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [networkQuality, isVideoStalled]);

  if (displayState === "hidden") {
    return null;
  }

  const positionClasses = isMobile ? "top-4 left-4" : "top-4 right-4";

  const iconClasses = displayState === "critical" ? "text-red-500" : "text-yellow-500";
  const bgClasses =
    displayState === "critical"
      ? "bg-red-500/10 border-red-500/20"
      : "bg-yellow-500/10 border-yellow-500/20";

  const message = displayState === "critical" ? "Poor connection" : "Unstable connection";

  const Icon = displayState === "critical" ? IconAlertCircle : IconAlertTriangle;

  return (
    <div
      className={`absolute z-20 ${positionClasses} pointer-events-none transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"
        }`}
    >
      <div
        className={`flex items-center gap-2 rounded-lg border ${bgClasses} px-3 py-2 backdrop-blur-sm`}
      >
        <Icon className={`size-4 ${iconClasses}`} />
        <span className="text-sm font-medium text-white">{message}</span>
      </div>
    </div>
  );
}
