'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';

export async function getStreakCalendar(
  year: number,
  month: number,
  timezone: string
): Promise<UsersAPI.Streak.Calendar.Response> {
  trackEventServer({ name: 'api_users_streak_calendar_get', properties: { year, month, timezone } });
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  return serverFetch(backendUrl.users.streakCalendar(params), {
    token: true,
    headers: { 'x-user-timezone': timezone },
  });
}
