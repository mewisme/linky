import type { User } from "@/stores/user-store";
import axios from 'axios';
import { config } from '@/shared/config';

export const client = axios.create({
  baseURL: config.apiUrl,
});

export const getMe = async (token: string | null): Promise<User> => {
  const response = await client.get<User>("/api/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};