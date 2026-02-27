'use server'

import type { UsersAPI } from '@/types/users.types';
import { auth } from '@clerk/nextjs/server';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function updateUserDetails(
  data: UsersAPI.UserDetails.PatchMe.Body
): Promise<UsersAPI.UserDetails.PatchMe.Response> {
  return withSentryAction("updateUserDetails", async () => {
    const result = await serverFetch<UsersAPI.UserDetails.PatchMe.Response>(
      backendUrl.users.details(),
      { method: 'PATCH', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.userProfile, 'max');
    return result;
  });
}

export async function getUserDetails(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryQuery(
    "getUserDetails",
    async (token) => serverFetch<UsersAPI.UserDetails.GetMe.Response>(
      backendUrl.users.details(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.userProfile], tags: [cacheTags.userProfile] },
  );
}

export async function getMe(): Promise<UsersAPI.GetMe.Response> {
  return withSentryQuery(
    "getMe",
    async (token) => serverFetch<UsersAPI.GetMe.Response>(
      backendUrl.users.me(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.userProfile, 'me'], tags: [cacheTags.userProfile] },
  );
}

export async function getUserProgress(
  timezone: string
): Promise<UsersAPI.Progress.GetMe.Response> {
  return withSentryQuery(
    "getUserProgress",
    async (token) => serverFetch<UsersAPI.Progress.GetMe.Response>(
      backendUrl.users.progress(),
      { preloadedToken: token, headers: { 'x-user-timezone': timezone } }
    ),
    { keyParts: [cacheTags.userProgress, timezone], tags: [cacheTags.userProgress] },
  );
}

export async function updateUserCountry(
  country: string
): Promise<UsersAPI.UpdateCountry.Response> {
  return withSentryAction("updateUserCountry", async () => {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    const result = await serverFetch<UsersAPI.UpdateCountry.Response>(
      backendUrl.users.meCountry(),
      { method: 'PATCH', body: JSON.stringify({ country, clerk_user_id: userId }), token: true }
    );
    revalidateTag(cacheTags.userProfile, 'max');
    return result;
  });
}
