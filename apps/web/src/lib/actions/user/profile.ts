'use server'

import { auth } from '@clerk/nextjs/server';
import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function updateUserDetails(
  data: UsersAPI.UserDetails.PatchMe.Body
): Promise<UsersAPI.UserDetails.PatchMe.Response> {
  return withSentryAction("updateUserDetails", async () => {
    trackEventServer({ name: 'api_users_details_patch' });
    return serverFetch(backendUrl.users.details(), {
      method: 'PATCH',
      body: JSON.stringify(data),
      token: true,
    });
  });
}

export async function getUserDetails(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryAction("getUserDetails", async () => {
    trackEventServer({ name: 'api_users_details_get' });
    return serverFetch(backendUrl.users.details(), { token: true });
  });
}

export async function getMe(): Promise<UsersAPI.GetMe.Response> {
  return withSentryAction("getMe", async () => {
    trackEventServer({ name: 'api_users_me_get' });
    return serverFetch(backendUrl.users.me(), { token: true });
  });
}

export async function getUserProgress(
  timezone: string
): Promise<UsersAPI.Progress.GetMe.Response> {
  return withSentryAction("getUserProgress", async () => {
    trackEventServer({ name: 'api_users_progress_get', properties: { timezone } });
    return serverFetch(backendUrl.users.progress(), {
      token: true,
      headers: { 'x-user-timezone': timezone },
    });
  });
}

export async function updateUserCountry(
  country: string
): Promise<UsersAPI.UpdateCountry.Response> {
  return withSentryAction("updateUserCountry", async () => {
    trackEventServer({ name: 'api_users_me_country_patch', properties: { country } });
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    return serverFetch(backendUrl.users.meCountry(), {
      method: 'PATCH',
      body: JSON.stringify({ country, clerk_user_id: userId }),
      token: true,
    });
  });
}
