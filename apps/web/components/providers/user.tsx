"use client";

import { getMe } from "@/lib/client";
import { logger } from "@/utils/logger";
import { useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase";
import { useUserStore } from "@/stores/user-store";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useSupabase();
  const { setUser, setLoading, setError, clearUser } = useUserStore();

  useEffect(() => {
    async function fetchUserData() {
      if (loading) {
        return;
      }

      if (!user) {
        clearUser();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = session?.access_token;
        if (!token) {
          throw new Error("No token found");
        }
        const userData = await getMe(token);
        setUser(userData);
      } catch (error) {
        logger.error("Failed to fetch user data:", error);
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
  }, [user, session, loading]);

  return <>{children}</>;
}

