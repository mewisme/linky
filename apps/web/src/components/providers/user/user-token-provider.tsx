"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";

type GetTokenOptions = { skipCache?: boolean };

type UserTokenContextValue = {
  token: string | null;
  getToken: (options?: GetTokenOptions) => Promise<string | null>;
};

const UserTokenContext = createContext<UserTokenContextValue | null>(null);

export function UserTokenProvider({ children }: { children: ReactNode }) {
  const { auth, getClerkToken } = useUserAuthContext();
  const [token, setToken] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<string | null> | null>(null);

  const getToken = useCallback(
    async (options?: GetTokenOptions) => {
      if (!options?.skipCache && inFlightRef.current) return inFlightRef.current;

      const promise = getClerkToken(options).finally(() => {
        inFlightRef.current = null;
      });

      if (!options?.skipCache) inFlightRef.current = promise;
      return promise;
    },
    [getClerkToken]
  );

  const refreshToken = useCallback(async () => {
    const next = await getToken();
    setToken(next);
    return next;
  }, [getToken]);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      setToken(null);
      return;
    }
    if (token !== null) return;
    void refreshToken();
  }, [auth.isLoaded, auth.isSignedIn, refreshToken, token]);

  const value = useMemo<UserTokenContextValue>(() => {
    return { token, getToken };
  }, [getToken, token]);

  return <UserTokenContext.Provider value={value}>{children}</UserTokenContext.Provider>;
}

export function useUserTokenContext() {
  const context = useContext(UserTokenContext);
  if (!context) {
    throw new Error("useUserTokenContext must be used within a UserTokenProvider");
  }
  return context;
}

