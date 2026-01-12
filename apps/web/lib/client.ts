import type { User } from "@/stores/user-store";
import axios from 'axios';

export const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export const getMe = async (token: string | null): Promise<User> => {
  const response = await axios.get<User>("/api/me", {
    baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};