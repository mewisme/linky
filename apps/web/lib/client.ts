import axios, { type AxiosInstance } from "axios";
import type { User } from "@/stores/user-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Token getter function type
type TokenGetter = () => Promise<string | null>;

// Global token getter that can be set from components
let tokenGetter: TokenGetter | null = null;

/**
 * Sets the token getter function for authentication
 * Call this from a component using useAuth().getToken
 * @param getter - Function that returns the Clerk token
 */
export function setTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter;
}

/**
 * Creates an axios instance with authentication interceptor
 */
function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add Authorization header with Clerk token
  instance.interceptors.request.use(
    async (config) => {
      if (tokenGetter) {
        try {
          const token = await tokenGetter();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Failed to get authentication token:", error);
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
}

export const client = createClient();

export const getMe = async (): Promise<User> => {
  const response = await client.get<User>("/api/v1/me");
  return response.data;
};