"use client";

import { getUserSettings, updateUserSettings } from "@/lib/actions/user/settings";
import type { UserSettings, UserState } from "@/stores/user-store";
import type { UsersAPI } from "@/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserAuthContext } from "./user-auth-provider";

type UserSettingsContextValue = {
  fetchUserSettings: () => Promise<void>;
  updateUserSettings: (data: UsersAPI.UserSettings.PatchMe.Body) => Promise<UserSettings>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();

  const fetchUserSettingsFn = useCallback(async () => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    store.setError(null);
    try {
      const settings = await getUserSettings();
      store.setUserSettings(settings);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Failed to fetch user settings");
    }
  }, [auth.isLoaded, auth.isSignedIn, store]);

  const updateUserSettingsFn = useCallback(
    async (data: UsersAPI.UserSettings.PatchMe.Body): Promise<UserSettings> => {
      const updated = await updateUserSettings(data);
      store.setUserSettings(updated);
      return updated;
    },
    [store]
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
