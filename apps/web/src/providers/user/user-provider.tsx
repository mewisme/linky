"use client";

import { UserDetails, UserSettings, UserState, useUserStore } from "@/entities/user/model/user-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { updateUserCountry } from "@/features/user/api/profile";
import { UsersAPI } from "@/entities/user/types/users.types";
import { UserAuthProvider, useUserAuthContext } from "./user-auth-provider";
import { UserTokenProvider, useUserTokenContext } from "./user-token-provider";
import { UserDataProvider, useUserDataContext } from "./user-data-provider";
import { UserDetailsProvider, useUserDetailsContext } from "./user-details-provider";
import { UserSettingsProvider, useUserSettingsContext } from "./user-settings-provider";

let lastBootstrappedUserId: string | null = null;
let bootstrapInFlight: Promise<void> | null = null;
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
  const { getToken } = useUserTokenContext();
  const { fetchUserData } = useUserDataContext();
  const { fetchUserDetails, updateUserDetails } = useUserDetailsContext();
  const { fetchUserSettings, updateUserSettings } = useUserSettingsContext();

  const authReady = useMemo(() => {
    return auth.isLoaded && !!auth.isSignedIn;
  }, [auth.isLoaded, auth.isSignedIn]);

  const authLoading = useMemo(() => {
    return !auth.isLoaded;
  }, [auth.isLoaded]);

  const updateUserCountryAndSyncStore = useCallback(
    async (country: string) => {
      const result = await updateUserCountry(country);
      store.setUser(result);
      return result;
    },
    [store],
  );

  const state = useMemo<State>(() => {
    return {
      getToken,
      updateUserCountry: updateUserCountryAndSyncStore,
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
    updateUserCountryAndSyncStore,
    updateUserDetails,
    updateUserSettings,
  ]);

  const fetchUserDataRef = useRef(fetchUserData);
  const fetchUserDetailsRef = useRef(fetchUserDetails);
  const fetchUserSettingsRef = useRef(fetchUserSettings);
  fetchUserDataRef.current = fetchUserData;
  fetchUserDetailsRef.current = fetchUserDetails;
  fetchUserSettingsRef.current = fetchUserSettings;

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      lastBootstrappedUserId = null;
      bootstrapInFlight = null;
      return;
    }
    const userId = user.user?.id ?? "__signed-in__";
    if (lastBootstrappedUserId === userId) return;
    if (bootstrapInFlight) return;
    const run = async () => {
      bootstrapInFlight = Promise.all([
        fetchUserDataRef.current(),
        fetchUserDetailsRef.current(),
        fetchUserSettingsRef.current(),
      ]).then(() => undefined);
      await bootstrapInFlight;
      lastBootstrappedUserId = userId;
      bootstrapInFlight = null;
    };
    void run();
  }, [auth.isLoaded, auth.isSignedIn, user.user?.id]);

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
