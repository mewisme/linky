"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@clerk/nextjs";

export function ClerkReadyIndicator() {
  const auth = useAuth();
  const hasSetReady = useRef(false);

  useEffect(() => {
    if (auth.isLoaded && !hasSetReady.current) {
      hasSetReady.current = true;
      document.body.setAttribute("data-clerk-ready", "true");
    }
  }, [auth.isLoaded]);

  return null;
}
