'use server'

import 'server-only';

import type { UsersAPI } from '@/entities/user/types/users.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getUserSettings(): Promise<UsersAPI.UserSettings.GetMe.Response> {
  return withSentryQuery(
    "getUserSettings",
    async () => serverFetch<UsersAPI.UserSettings.GetMe.Response>(backendUrl.users.settings()),
  );
}

export async function updateUserSettings(
  data: UsersAPI.UserSettings.PatchMe.Body
): Promise<UsersAPI.UserSettings.PatchMe.Response> {
  return withSentryAction("updateUserSettings", async () =>
    serverFetch<UsersAPI.UserSettings.PatchMe.Response>(
      backendUrl.users.settings(),
      { method: 'PATCH', body: JSON.stringify(data) }
    ));
}

export async function replaceUserSettings(
  data: UsersAPI.UserSettings.UpdateMe.Body
): Promise<UsersAPI.UserSettings.UpdateMe.Response> {
  return withSentryAction("replaceUserSettings", async () =>
    serverFetch<UsersAPI.UserSettings.UpdateMe.Response>(
      backendUrl.users.settings(),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}
