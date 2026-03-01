"use client";

import { getMe } from "@/features/user/api/profile";
import type { UserState } from "@/entities/user/model/user-store";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";

type UserDataContextValue = {
  fetchUserData: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();

  const fetchUserDataFn = useCallback(async () => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      store.clearUser();
      return;
    }
    store.setError(null);
    try {
      const userData = await getMe();
      store.setUser(userData);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to fetch user data");
      store.setUser(null);
    }
  }, [auth.isLoaded, auth.isSignedIn, store]);

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
