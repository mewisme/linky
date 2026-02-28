'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/sentry/with-action';

export async function getStreakCalendar(
  year: number,
  month: number
): Promise<UsersAPI.Streak.Calendar.Response> {
  return withSentryQuery(
    "getStreakCalendar",
    async (token) => {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      return serverFetch<UsersAPI.Streak.Calendar.Response>(
        backendUrl.users.streakCalendar(params),
        { preloadedToken: token }
      );
    },
    { keyParts: [cacheTags.userStreak, String(year), String(month)], tags: [cacheTags.userStreak] },
  );
}
