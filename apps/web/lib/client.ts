import type { User } from "@/stores/user-store";
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  console.log('[client.ts] request with token', token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


export const getMe = async (): Promise<User> => {
  const response = await client.get<User>("/api/v1/me");
  return response.data;
};