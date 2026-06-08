"use client";

import { trackEvent } from "@/lib/telemetry/events/client";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { resolveActionErrorMessage } from "@/shared/lib/i18n/resolve-action-error-message";
import type { UserDetails, UserState } from "@/entities/user/model/user-store";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useUserAuthContext } from "./user-auth-provider";

type UserDetailsContextValue = {
  fetchUserDetails: () => Promise<void>;
  updateUserDetails: (data: UsersAPI.UserDetails.PatchMe.Body) => Promise<UserDetails>;
};

const UserDetailsContext = createContext<UserDetailsContextValue | null>(null);

export function UserDetailsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const tRoot = useTranslations();

  const fetchUserDetailsFn = useCallback(async () => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    store.setError(null);
    try {
      const details = await fetchFromActionRoute<UsersAPI.UserDetails.GetMe.Response>("/api/users/details");
      store.setUserDetails(details);
    } catch (error) {
      store.setError(resolveActionErrorMessage(error, tRoot, "errors.fetchUserDetails"));
    }
  }, [auth.isLoaded, auth.isSignedIn, store, tRoot]);

  const updateUserDetailsFn = useCallback(
    async (data: UsersAPI.UserDetails.PatchMe.Body): Promise<UserDetails> => {
      const updated = await fetchFromActionRoute<UserDetails>("/api/users/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
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
