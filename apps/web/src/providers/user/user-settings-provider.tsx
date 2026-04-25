"use client";

import { getUserSettings, updateUserSettings } from "@/features/user/api/settings";
import type { UserSettings, UserState } from "@/entities/user/model/user-store";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useUserAuthContext } from "./user-auth-provider";
import { useSidebarStore } from "@/shared/model/sidebar-store";
import { normalizeUserSidebarPreferences } from '@/entities/user/lib'
import { useShaderPreferenceStore } from "@/shared/model/shader-preference-store";

type UserSettingsContextValue = {
  fetchUserSettings: () => Promise<void>;
  updateUserSettings: (data: UsersAPI.UserSettings.PatchMe.Body) => Promise<UserSettings>;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth } = useUserAuthContext();
  const t = useTranslations("errors");

  const applyClientPreferences = useCallback((settings: UsersAPI.UserSettings.GetMe.Response) => {
    const sidebar = normalizeUserSidebarPreferences(settings.sidebar);
    const sidebarStore = useSidebarStore.getState();
    sidebarStore.setVariant(sidebar.variant);
    sidebarStore.setCollapsible(sidebar.collapsible);
    useShaderPreferenceStore.getState().setFromUnknown(settings.shader);
  }, []);

  const fetchUserSettingsFn = useCallback(async () => {
    if (!auth.isLoaded || !auth.isSignedIn) return;
    store.setError(null);
    try {
      const settings = await getUserSettings();
      store.setUserSettings(settings);
      applyClientPreferences(settings);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : t("fetchUserSettings"));
    }
  }, [applyClientPreferences, auth.isLoaded, auth.isSignedIn, store, t]);

  const updateUserSettingsFn = useCallback(
    async (data: UsersAPI.UserSettings.PatchMe.Body): Promise<UserSettings> => {
      const updated = await updateUserSettings(data);
      store.setUserSettings(updated);
      applyClientPreferences(updated);
      return updated;
    },
    [applyClientPreferences, store]
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
