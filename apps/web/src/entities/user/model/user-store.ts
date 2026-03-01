import { UsersAPI } from "@/entities/user/types/users.types";
import { create } from "zustand";

export type User = UsersAPI.GetMe.Response;
export type UserDetails = UsersAPI.UserDetails.GetMe.Response;
export type UserSettings = UsersAPI.UserSettings.GetMe.Response;

export interface UserState {
  user: User | null;
  userDetails: UserDetails | null;
  userSettings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setUserDetails: (userDetails: UserDetails | null) => void;
  setUserSettings: (userSettings: UserSettings | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userDetails: null,
  userSettings: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setUserDetails: (userDetails) => set({ userDetails, error: null }),
  setUserSettings: (userSettings) => set({ userSettings, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearUser: () => set({ user: null, error: null, isLoading: false }),
}));
