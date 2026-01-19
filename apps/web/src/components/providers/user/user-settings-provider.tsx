"use client";

import { fetchUserSettings, updateUserSettings } from "@/services/user";
import type { UserSettings, UserState } from "@/stores/user-store";
import type { UsersAPI } from "@/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";
import { useUserTokenContext } from "./user-token-provider";

type UserSettingsContextValue = {
  fetchUserSettings: () => Promise<void>;
  updateUserSettings: (data: UsersAPI.UserSettings.PatchMe.Body) => Promise<UserSettings>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const { token } = useUserTokenContext();

  const fetchUserSettingsFn = useCallback(async () => {
    await fetchUserSettings({
      isLoaded: auth.isLoaded,
      isSignedIn: auth.isSignedIn,
      token,
      setUserSettings: store.setUserSettings,
      setError: store.setError,
    });
  }, [auth.isLoaded, auth.isSignedIn, store.setError, store.setUserSettings, token]);

  const updateUserSettingsFn = useCallback(
    async (data: UsersAPI.UserSettings.PatchMe.Body) => {
      const updated = await updateUserSettings({ token, data });
      store.setUserSettings(updated);
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.setUserSettings, token],
  );

  const value = useMemo<UserSettingsContextValue>(() => {
    return { fetchUserSettings: fetchUserSettingsFn, updateUserSettings: updateUserSettingsFn };
  }, [fetchUserSettingsFn, updateUserSettingsFn]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettingsContext() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettingsContext must be used within a UserSettingsProvider");
  }
  return context;
}

