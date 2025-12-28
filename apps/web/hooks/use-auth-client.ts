"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/client";

/**
 * Hook to automatically configure the axios client with Clerk authentication
 * Call this hook in your component to enable automatic token injection
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useAuthClient();
 *   const { getMe } = useApi();
 *   
 *   useEffect(() => {
 *     getMe().then(console.log);
 *   }, []);
 * }
 * ```
 */
export function useAuthClient(): void {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      // Set the token getter function for axios client
      setTokenGetter(async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error("Failed to get authentication token:", error);
          return null;
        }
      });
    }
  }, [getToken, isLoaded]);
}

