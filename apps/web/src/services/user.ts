import { User, UserDetails, UserSettings } from "@/stores/user-store";

import { UsersAPI } from "@/types";

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
    const res = await fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const userData = (await res.json()) as User;
    setUser(userData);
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    setError(error instanceof Error ? error.message : "Failed to fetch user data");
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
    const res = await fetch("/api/users/details", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const userDetailsData = (await res.json()) as UserDetails;
    setUserDetails(userDetailsData);
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    setError(error instanceof Error ? error.message : "Failed to fetch user details");
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
    const res = await fetch("/api/users/settings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const userSettingsData = (await res.json()) as UserSettings;
    setUserSettings(userSettingsData);
  } catch (error) {
    console.error("Failed to fetch user settings:", error);
    setError(error instanceof Error ? error.message : "Failed to fetch user settings");
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
    throw new Error("Missing required parameters");
  }
  try {
    const res = await fetch("/api/users/me/country", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        country: params.country,
        clerk_user_id: params.clerk_user_id,
      }),
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return (await res.json()) as UsersAPI.UpdateCountry.Response;
  } catch (error) {
    console.error("Failed to update user country:", error);
    throw error;
  }
}

interface UpdateUserDetailsParams {
  token: string | null;
  data: UsersAPI.UserDetails.PatchMe.Body;
}

export async function updateUserDetails(params: UpdateUserDetailsParams) {
  if (!params.token) {
    throw new Error("Missing required parameters");
  }
  try {
    const res = await fetch("/api/users/details", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify(params.data),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text || res.statusText;
      try {
        const data = JSON.parse(text) as { message?: string };
        if (data.message) msg = data.message;
      } catch {
        /* use msg as-is */
      }
      throw new Error(msg);
    }
    return (await res.json()) as UserDetails;
  } catch (error) {
    console.error("Failed to update user details:", error);
    throw error;
  }
}

interface UpdateUserSettingsParams {
  token: string | null;
  data: UsersAPI.UserSettings.PatchMe.Body;
}

export async function updateUserSettings(params: UpdateUserSettingsParams) {
  if (!params.token) {
    throw new Error("Missing required parameters");
  }
  try {
    const res = await fetch("/api/users/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify(params.data),
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    return (await res.json()) as UserSettings;
  } catch (error) {
    console.error("Failed to update user settings:", error);
    throw error;
  }
}
