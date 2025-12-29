"use client";

/**
 * Hook to ensure API client is ready with authentication
 * Returns loading state and ensures token is available before API calls
 */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useApiClientReady() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkReady() {
      if (isLoaded && isSignedIn) {
        // Try to get token to ensure it's available
        try {
          const token = await getToken();
          if (token) {
            console.log("[useApiClientReady] API client is ready with token");
            setIsReady(true);
          } else {
            console.warn("[useApiClientReady] No token available");
            setIsReady(false);
          }
        } catch (error) {
          console.error("[useApiClientReady] Error getting token:", error);
          setIsReady(false);
        }
      } else {
        setIsReady(false);
      }
    }

    checkReady();
  }, [isLoaded, isSignedIn, getToken]);

  return {
    isReady,
    isLoaded,
    isSignedIn,
  };
}

