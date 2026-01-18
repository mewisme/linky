"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type UserAuthContextValue = {
  auth: ReturnType<typeof useAuth>;
  user: ReturnType<typeof useUser>;
  getClerkToken: () => Promise<string | null>;
};

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const user = useUser();

  const getClerkToken = useCallback(() => {
    return auth.getToken({ template: "custom", skipCache: true });
  }, [auth.getToken]);

  const value = useMemo<UserAuthContextValue>(() => {
    return { auth, user, getClerkToken };
  }, [auth, getClerkToken, user]);

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuthContext() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuthContext must be used within a UserAuthProvider");
  }
  return context;
}

