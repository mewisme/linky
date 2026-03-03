"use client";

import * as Sentry from "@sentry/nextjs";
import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";

type GetTokenOptions = { skipCache?: boolean };

type UserTokenContextValue = {
  getToken: (options?: GetTokenOptions) => Promise<string | null>;
};

const UserTokenContext = createContext<UserTokenContextValue | null>(null);

export function UserTokenProvider({ children }: { children: ReactNode }) {
  const { getClerkToken } = useUserAuthContext();
  const inFlightRef = useRef<Promise<string | null> | null>(null);

  const getToken = useCallback(
    async (options?: GetTokenOptions) => {
      if (!options?.skipCache && inFlightRef.current) return inFlightRef.current;

      const promise = getClerkToken(options).finally(() => {
        inFlightRef.current = null;
      });

      if (!options?.skipCache) inFlightRef.current = promise;
      Sentry.logger.info("Getting token", { options });
      return promise;
    },
    [getClerkToken]
  );

  return (
    <UserTokenContext.Provider value={{ getToken }}>
      {children}
    </UserTokenContext.Provider>
  );
}

export function useUserTokenContext() {
  const context = useContext(UserTokenContext);
  if (!context) {
    throw new Error("useUserTokenContext must be used within a UserTokenProvider");
  }
  return context;
}
