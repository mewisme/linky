"use client";

import { useEffect, useState } from "react";

export function useViewportHeight(offset: number = 0): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      setHeight(viewportHeight - offset);
    };

    updateHeight();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener("resize", updateHeight);
      visualViewport.addEventListener("scroll", updateHeight);
      window.addEventListener("orientationchange", updateHeight);
      return () => {
        visualViewport.removeEventListener("resize", updateHeight);
        visualViewport.removeEventListener("scroll", updateHeight);
        window.removeEventListener("orientationchange", updateHeight);
      };
    } else {
      window.addEventListener("resize", updateHeight);
      window.addEventListener("orientationchange", updateHeight);
      return () => {
        window.removeEventListener("resize", updateHeight);
        window.removeEventListener("orientationchange", updateHeight);
      };
    }
  }, [offset]);

  return height;
}
