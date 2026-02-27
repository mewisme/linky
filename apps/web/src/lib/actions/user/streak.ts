'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getStreakCalendar(
  year: number,
  month: number,
  timezone: string
): Promise<UsersAPI.Streak.Calendar.Response> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  return serverFetch(backendUrl.users.streakCalendar(params), {
    token: true,
    headers: { 'x-user-timezone': timezone },
  });
}
