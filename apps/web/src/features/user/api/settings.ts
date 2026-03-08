'use server'

import type { UsersAPI } from '@/entities/user/types/users.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getUserSettings(): Promise<UsersAPI.UserSettings.GetMe.Response> {
  return withSentryQuery(
    "getUserSettings",
    async (token) => serverFetch<UsersAPI.UserSettings.GetMe.Response>(
      backendUrl.users.settings(), { preloadedToken: token }
    ),
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
