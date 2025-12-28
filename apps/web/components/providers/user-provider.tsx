"use client";

import { getMe } from "@/lib/client";
import { useAuth } from "@clerk/nextjs";
import { useAuthClient } from "@/hooks/use-auth-client";
import { useEffect } from "react";
import { useUserStore } from "@/stores/user-store";

/**
 * Provider component that fetches and stores user data from the API
 * Should be used in the root layout to fetch user data when entering the website
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { setUser, setLoading, setError, clearUser } = useUserStore();
  useAuthClient(); // Set up axios client with Clerk authentication

  useEffect(() => {
    async function fetchUserData() {
      // Wait for Clerk to load
      if (!isLoaded) {
        return;
      }

      // If user is not signed in, clear user data
      if (!isSignedIn) {
        clearUser();
        return;
      }

      // Fetch user data from API
      setLoading(true);
      setError(null);

      try {
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch user data";
        setError(errorMessage);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded]);

  return <>{children}</>;
}

