"use client";

import { trackEvent } from "@/lib/analytics/events";
import { fetchUserDetails, updateUserDetails } from "@/services/user";
import type { UserDetails, UserState } from "@/stores/user-store";
import type { UsersAPI } from "@/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";
import { useUserTokenContext } from "./user-token-provider";

type UserDetailsContextValue = {
  fetchUserDetails: () => Promise<void>;
  updateUserDetails: (data: UsersAPI.UserDetails.PatchMe.Body) => Promise<UserDetails>;
};

const UserDetailsContext = createContext<UserDetailsContextValue | null>(null);

export function UserDetailsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const { token } = useUserTokenContext();

  const fetchUserDetailsFn = useCallback(async () => {
    await fetchUserDetails({
      isLoaded: auth.isLoaded,
      isSignedIn: auth.isSignedIn,
      token,
      setUserDetails: store.setUserDetails,
      setError: store.setError,
    });
  }, [auth.isLoaded, auth.isSignedIn, store.setError, store.setUserDetails, token]);

  const updateUserDetailsFn = useCallback(
    async (data: UsersAPI.UserDetails.PatchMe.Body) => {
      const updated = await updateUserDetails({ token, data });
      store.setUserDetails(updated);
      trackEvent({
        name: "profile_updated",
        properties: { fields: Object.keys(data).join(",") },
      });
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.setUserDetails, token],
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

