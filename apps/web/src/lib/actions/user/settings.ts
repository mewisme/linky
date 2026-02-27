'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getUserSettings(): Promise<UsersAPI.UserSettings.GetMe.Response> {
  return withSentryAction("getUserSettings", async () => {
    return serverFetch(backendUrl.users.settings(), { token: true });
  });
}

export async function updateUserSettings(
  data: UsersAPI.UserSettings.PatchMe.Body
): Promise<UsersAPI.UserSettings.PatchMe.Response> {
  return withSentryAction("updateUserSettings", async () => {
    return serverFetch(backendUrl.users.settings(), {
      method: 'PATCH',
      body: JSON.stringify(data),
      token: true,
    });
  });
}
