'use server'

import type { UsersAPI } from '@/types/users.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function getUserSettings(): Promise<UsersAPI.UserSettings.GetMe.Response> {
  return withSentryQuery(
    "getUserSettings",
    async (token) => serverFetch<UsersAPI.UserSettings.GetMe.Response>(
      backendUrl.users.settings(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.userSettings], tags: [cacheTags.userSettings] },
  );
}

export async function updateUserSettings(
  data: UsersAPI.UserSettings.PatchMe.Body
): Promise<UsersAPI.UserSettings.PatchMe.Response> {
  return withSentryAction("updateUserSettings", async () => {
    const result = await serverFetch<UsersAPI.UserSettings.PatchMe.Response>(
      backendUrl.users.settings(),
      { method: 'PATCH', body: JSON.stringify(data), token: true }
    );
    revalidateTag(cacheTags.userSettings, 'max');
    return result;
  });
}
