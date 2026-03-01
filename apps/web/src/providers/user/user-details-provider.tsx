"use client";

import { trackEvent } from "@/lib/telemetry/events/client";
import { getUserDetails, updateUserDetails } from "@/features/user/api/profile";
import type { UserDetails, UserState } from "@/entities/user/model/user-store";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";

type UserDetailsContextValue = {
  fetchUserDetails: () => Promise<void>;
  updateUserDetails: (data: UsersAPI.UserDetails.PatchMe.Body) => Promise<UserDetails>;
};

const UserDetailsContext = createContext<UserDetailsContextValue | null>(null);

export function UserDetailsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();

  const fetchUserDetailsFn = useCallback(async () => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    store.setError(null);
    try {
      const details = await getUserDetails();
      store.setUserDetails(details);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to fetch user details");
    }
  }, [auth.isLoaded, auth.isSignedIn, store]);

  const updateUserDetailsFn = useCallback(
    async (data: UsersAPI.UserDetails.PatchMe.Body): Promise<UserDetails> => {
      const updated = await updateUserDetails(data);
      store.setUserDetails(updated);
      trackEvent({
        name: "profile_updated",
        properties: { fields: Object.keys(data).join(",") },
      });
      return updated;
    },
    [store]
  );

  const value = useMemo<UserDetailsContextValue>(() => {
    return { fetchUserDetails: fetchUserDetailsFn, updateUserDetails: updateUserDetailsFn };
  }, [fetchUserDetailsFn, updateUserDetailsFn]);

  return <UserDetailsContext.Provider value={value}>{children}</UserDetailsContext.Provider>;
}

export function useUserDetailsContext() {
  const context = useContext(UserDetailsContext);
  if (!context) {
    throw new Error("useUserDetailsContext must be used within a UserDetailsProvider");
  }
  return context;
}
