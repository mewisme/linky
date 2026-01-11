"use client";

import { useEffect, useRef } from "react";

export function useVisitorTracking() {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionKey = "visitor_tracked";
    const tracked = sessionStorage.getItem(sessionKey);

    if (tracked || hasTrackedRef.current) {
      return;
    }

    const trackVisitor = async () => {
      try {
        const response = await fetch("/api/analytics/visitor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          sessionStorage.setItem(sessionKey, "true");
          hasTrackedRef.current = true;
        }
      } catch (error) {
        console.warn("Error tracking visitor:", error);
      }
    };

    trackVisitor();
  }, []);
}

