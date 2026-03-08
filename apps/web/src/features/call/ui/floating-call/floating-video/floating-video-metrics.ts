import type { FloatingLayoutMode } from "./floating-video-state";

export interface FloatingVideoMetrics {
  layoutMode: FloatingLayoutMode;
  width: string;
  maxHeightVh?: number;
  isMobile: boolean;
}

const DESKTOP_WIDTH = "180px";
const MOBILE_WIDTH = "160px";
const MOBILE_MAX_HEIGHT_VH = 28;

export function getFloatingVideoMetrics(args: {
  isMobile: boolean;
  layoutMode: FloatingLayoutMode;
}): FloatingVideoMetrics {
  const { isMobile, layoutMode } = args;

  let width: string;
  let maxHeightVh: number | undefined;

  if (layoutMode === "dual") {
    width = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
    maxHeightVh = isMobile ? MOBILE_MAX_HEIGHT_VH : undefined;
  } else if (layoutMode === "single-remote" || layoutMode === "single-local") {
    width = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
    maxHeightVh = isMobile ? MOBILE_MAX_HEIGHT_VH : undefined;
  } else {
    width = isMobile ? MOBILE_WIDTH : "240px";
    maxHeightVh = isMobile ? MOBILE_MAX_HEIGHT_VH : undefined;
  }

  return {
    layoutMode,
    width,
    maxHeightVh,
    isMobile,
  };
}

