"use client";

import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { resolveActionErrorMessage } from "@/shared/lib/i18n/resolve-action-error-message";
import type { User, UserState } from "@/entities/user/model/user-store";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useUserAuthContext } from "./user-auth-provider";

type UserDataContextValue = {
  fetchUserData: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const tRoot = useTranslations();

  const fetchUserDataFn = useCallback(async () => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      store.clearUser();
      return;
    }
    store.setError(null);
    try {
      const userData = await fetchFromActionRoute<User>("/api/users/me");
      store.setUser(userData);
    } catch (error) {
      store.setError(resolveActionErrorMessage(error, tRoot, "errors.fetchUserData"));
      store.setUser(null);
    }
  }, [auth.isLoaded, auth.isSignedIn, store, tRoot]);

  const value = useMemo<UserDataContextValue>(() => {
    return { fetchUserData: fetchUserDataFn };
  }, [fetchUserDataFn]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserDataContext() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserDataContext must be used within a UserDataProvider");
  }
  return context;
}
