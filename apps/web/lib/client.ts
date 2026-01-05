import type { User } from "@/stores/user-store";
import axios from 'axios';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const client = axios.create({
  baseURL: API_URL,
});

export const getMe = async (token: string | null): Promise<User> => {
  const response = await client.get<User>("/api/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};