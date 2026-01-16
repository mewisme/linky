import { User, UserDetails, UserSettings } from "@/stores/user-store";

import { UsersAPI } from "@/types";
import axios from "axios";
import { logger } from "@/utils/logger";

interface FetchUserDataParams {
  isLoaded: boolean;
  isSignedIn?: boolean;
  token: string | null;
  clearUser: () => void;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export async function fetchUserData(params: FetchUserDataParams) {
  const { isLoaded, isSignedIn, token, clearUser, setUser, setError } = params;
  if (!isLoaded) return;
  if (!isSignedIn) {
    clearUser();
    return;
  }
  if (!token) return;

  setError(null);

  try {
    const userData = await axios.get<User>('/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setUser(userData.data);
  } catch (error) {
    logger.error('Failed to fetch user data:', error);
    setError(error instanceof Error ? error.message : 'Failed to fetch user data');
    setUser(null);
  }
}

interface FetchUserDetailsParams {
  isLoaded: boolean;
  isSignedIn?: boolean;
  token: string | null;
  setUserDetails: (userDetails: UserDetails | null) => void;
  setError: (error: string | null) => void;
}

export async function fetchUserDetails(params: FetchUserDetailsParams) {
  const { isLoaded, isSignedIn, token, setUserDetails, setError } = params;
  if (!isLoaded) return;
  if (!isSignedIn) return;
  if (!token) return;

  setError(null);

  try {
    const userDetailsData = await axios.get<UserDetails>('/api/users/user-details/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setUserDetails(userDetailsData.data);
  } catch (error) {
    logger.error('Failed to fetch user details:', error);
    setError(error instanceof Error ? error.message : 'Failed to fetch user details');
    setUserDetails(null);
  }
}

interface FetchUserSettingsParams {
  isLoaded: boolean;
  isSignedIn?: boolean;
  token: string | null;
  setUserSettings: (userSettings: UserSettings | null) => void;
  setError: (error: string | null) => void;
}

export async function fetchUserSettings(params: FetchUserSettingsParams) {
  const { isLoaded, isSignedIn, token, setUserSettings, setError } = params;

  if (!isLoaded) return;
  if (!isSignedIn) return;
  if (!token) return;

  setError(null);

  try {
    const userSettingsData = await axios.get<UserSettings>('/api/users/user-settings/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setUserSettings(userSettingsData.data);
  } catch (error) {
    logger.error('Failed to fetch user settings:', error);
    setError(error instanceof Error ? error.message : 'Failed to fetch user settings');
    setUserSettings(null);
  }
}

interface UpdateUserCountryParams {
  token: string | null;
  country: string;
  clerk_user_id?: string;
}

export async function updateUserCountry(params: UpdateUserCountryParams) {
  if (!params.token || !params.country || !params.clerk_user_id) {
    throw new Error('Missing required parameters');
  }
  try {
    const response = await axios.patch<UsersAPI.UpdateCountry.Response>('/api/users/me/country', {
      country: params.country,
      clerk_user_id: params.clerk_user_id,
    }, {
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to update user country:', error);
    throw error;
  }
}

interface UpdateUserDetailsParams {
  token: string | null;
  data: UsersAPI.UserDetails.PatchMe.Body;
}

export async function updateUserDetails(params: UpdateUserDetailsParams) {
  if (!params.token) {
    throw new Error('Missing required parameters');
  }
  try {
    const response = await axios.patch<UserDetails>('/api/users/user-details/me', params.data, {
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to update user details:', error);
    throw error;
  }
}

interface UpdateUserSettingsParams {
  token: string | null;
  data: UsersAPI.UserSettings.PatchMe.Body;
}

export async function updateUserSettings(params: UpdateUserSettingsParams) {
  if (!params.token) {
    throw new Error('Missing required parameters');
  }
  try {
    const response = await axios.patch<UserSettings>('/api/users/user-settings/me', params.data, {
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to update user settings:', error);
    throw error;
  }
}