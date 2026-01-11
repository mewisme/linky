"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function usePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    hasTrackedRef.current = false;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (hasTrackedRef.current) return;

    const path = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    const trackPageView = async () => {
      try {
        const response = await fetch("/api/analytics/visit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path }),
        });

        if (!response.ok) {
          console.warn("Failed to track page view:", response.statusText);
        } else {
          hasTrackedRef.current = true;
        }
      } catch (error) {
        console.warn("Error tracking page view:", error);
      }
    };

    const timeoutId = setTimeout(trackPageView, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname, searchParams]);
}

