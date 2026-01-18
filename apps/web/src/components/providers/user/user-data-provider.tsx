"use client";

import { fetchUserData } from "@/services/user";
import type { UserState } from "@/stores/user-store";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";
import { useUserTokenContext } from "./user-token-provider";

type UserDataContextValue = {
  fetchUserData: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const { token } = useUserTokenContext();

  const fetchUserDataFn = useCallback(async () => {
    await fetchUserData({
      isLoaded: auth.isLoaded,
      isSignedIn: auth.isSignedIn,
      token,
      clearUser: store.clearUser,
      setUser: store.setUser,
      setError: store.setError,
    });
  }, [auth.isLoaded, auth.isSignedIn, store.clearUser, store.setError, store.setUser, token]);

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

