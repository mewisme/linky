"use client";

import { UserDetails, UserSettings, UserState, useUserStore } from "@/stores/user-store";
import { createContext, useContext, useState } from "react";
import { fetchUserData, fetchUserDetails, fetchUserSettings, updateUserCountry, updateUserDetails, updateUserSettings } from "@/services/user";
import { useAuth, useUser } from "@clerk/nextjs";

import { UsersAPI } from "@/types/users.types";
import { useEffect } from "react";

interface State {
  updateUserCountry: (country: string) => Promise<UsersAPI.GetMe.Response>;
  updateUserDetails: (data: UsersAPI.UserDetails.PatchMe.Body) => Promise<UserDetails>;
  updateUserSettings: (data: UsersAPI.UserSettings.PatchMe.Body) => Promise<UserSettings>;
  fetchUserDetails: () => Promise<void>;
}
interface UserContextData {
  user: ReturnType<typeof useUser>;
  auth: ReturnType<typeof useAuth>;
  store: UserState;
  state: State;
}


const UserContext = createContext<UserContextData | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const user = useUser();
  const store = useUserStore();
  const [token, setToken] = useState<string | null>(null);

  const { isSignedIn, isLoaded, getToken } = auth;
  const { setUser, setUserDetails, setUserSettings, setError, clearUser } = store;

  useEffect(() => {
    async function fetchToken() {
      const token = await getToken({ template: 'custom', skipCache: true });
      setToken(token);
    }
    fetchToken();
  }, [getToken])

  const state = {
    updateUserCountry: (country: string) => updateUserCountry({ token, country, clerk_user_id: user.user?.id }),
    updateUserDetails: async (data: UsersAPI.UserDetails.PatchMe.Body) => {
      const updated = await updateUserDetails({ token, data });
      setUserDetails(updated);
      return updated;
    },
    updateUserSettings: async (data: UsersAPI.UserSettings.PatchMe.Body) => {
      const updated = await updateUserSettings({ token, data });
      setUserSettings(updated);
      return updated;
    },
    fetchUserDetails: async () => {
      await fetchUserDetails({ isLoaded, isSignedIn, token, setUserDetails, setError });
    },
    fetchUserData: () => fetchUserData({ isLoaded, isSignedIn, token, clearUser, setUser, setError }),
    fetchUserSettings: () => fetchUserSettings({ isLoaded, isSignedIn, token, setUserSettings, setError }),
  }

  useEffect(() => {
    async function fetchData() {
      await Promise.all([
        fetchUserData({ isLoaded, isSignedIn, token, clearUser, setUser, setError }),
        fetchUserDetails({ isLoaded, isSignedIn, token, setUserDetails, setError }),
        fetchUserSettings({ isLoaded, isSignedIn, token, setUserSettings, setError }),
      ]);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded, token]);

  return (
    <UserContext.Provider value={{ user, auth, store, state }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};