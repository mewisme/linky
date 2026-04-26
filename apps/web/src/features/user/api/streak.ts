'use server'

import 'server-only';

import type { UsersAPI } from '@/entities/user/types/users.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryQuery } from '@/lib/monitoring/with-action';

export async function getStreakCalendar(
  year: number,
  month: number
): Promise<UsersAPI.Streak.Calendar.Response> {
  return withSentryQuery(
    "getStreakCalendar",
    async () => {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      return serverFetch<UsersAPI.Streak.Calendar.Response>(backendUrl.users.streakCalendar(params));
    },
  );
}
