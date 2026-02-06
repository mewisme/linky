"use client";

import { UserDetails, UserSettings, UserState, useUserStore } from "@/stores/user-store";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { updateUserCountry } from "@/services/user";
import { UsersAPI } from "@/types/users.types";
import { UserAuthProvider, useUserAuthContext } from "./user-auth-provider";
import { UserTokenProvider, useUserTokenContext } from "./user-token-provider";
import { UserDataProvider, useUserDataContext } from "./user-data-provider";
import { UserDetailsProvider, useUserDetailsContext } from "./user-details-provider";
import { UserSettingsProvider, useUserSettingsContext } from "./user-settings-provider";

interface State {
  updateUserCountry: (country: string) => Promise<UsersAPI.GetMe.Response>;
  updateUserDetails: (data: UsersAPI.UserDetails.PatchMe.Body) => Promise<UserDetails>;
  updateUserSettings: (data: UsersAPI.UserSettings.PatchMe.Body) => Promise<UserSettings>;
  fetchUserDetails: () => Promise<void>;
  fetchUserData: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>;
}

interface UserContextData {
  user: ReturnType<typeof useUserAuthContext>["user"];
  auth: ReturnType<typeof useUserAuthContext>["auth"];
  store: UserState;
  state: State;
  authReady: boolean;
  authLoading: boolean;
}

const UserContext = createContext<UserContextData | null>(null);

function UserComposedProvider({ children, store }: { children: ReactNode; store: UserState }) {
  const { auth, user } = useUserAuthContext();
  const { token, getToken } = useUserTokenContext();
  const { fetchUserData } = useUserDataContext();
  const { fetchUserDetails, updateUserDetails } = useUserDetailsContext();
  const { fetchUserSettings, updateUserSettings } = useUserSettingsContext();

  const authReady = useMemo(() => {
    return auth.isLoaded && auth.isSignedIn && token !== null;
  }, [auth.isLoaded, auth.isSignedIn, token]);

  const authLoading = useMemo(() => {
    return !auth.isLoaded || (auth.isLoaded && auth.isSignedIn && token === null);
  }, [auth.isLoaded, auth.isSignedIn, token]);

  const state = useMemo<State>(() => {
    return {
      getToken,
      updateUserCountry: (country: string) => updateUserCountry({ token, country, clerk_user_id: user.user?.id }),
      updateUserDetails,
      updateUserSettings,
      fetchUserDetails,
      fetchUserData,
      fetchUserSettings,
    };
  }, [
    fetchUserData,
    fetchUserDetails,
    fetchUserSettings,
    getToken,
    token,
    updateUserDetails,
    updateUserSettings,
    user.user?.id,
  ]);

  useEffect(() => {
    const run = async () => {
      await Promise.all([fetchUserData(), fetchUserDetails(), fetchUserSettings()]);
    };

    void run();
  }, [auth.isLoaded, auth.isSignedIn, fetchUserData, fetchUserDetails, fetchUserSettings, token]);

  const value = useMemo<UserContextData>(() => {
    return { user, auth, store, state, authReady, authLoading };
  }, [auth, state, store, user, authReady, authLoading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const store = useUserStore();

  return (
    <UserAuthProvider>
      <UserTokenProvider>
        <UserDataProvider store={store}>
          <UserDetailsProvider store={store}>
            <UserSettingsProvider store={store}>
              <UserComposedProvider store={store}>{children}</UserComposedProvider>
            </UserSettingsProvider>
          </UserDetailsProvider>
        </UserDataProvider>
      </UserTokenProvider>
    </UserAuthProvider>
  );
}

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};