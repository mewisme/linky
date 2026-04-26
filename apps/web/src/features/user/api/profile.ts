'use server'

import 'server-only';

import * as Sentry from "@sentry/nextjs";

import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

import type { UsersAPI } from '@/entities/user/types/users.types';
import { auth } from '@clerk/nextjs/server';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';

export async function updateUserDetails(
  data: UsersAPI.UserDetails.PatchMe.Body
): Promise<UsersAPI.UserDetails.PatchMe.Response> {
  return withSentryAction("updateUserDetails", async () =>
    serverFetch<UsersAPI.UserDetails.PatchMe.Response>(
      backendUrl.users.details(),
      { method: 'PATCH', body: JSON.stringify(data) }
    ));
}

export async function replaceUserDetails(
  data: UsersAPI.UserDetails.UpdateMe.Body
): Promise<UsersAPI.UserDetails.UpdateMe.Response> {
  return withSentryAction("replaceUserDetails", async () =>
    serverFetch<UsersAPI.UserDetails.UpdateMe.Response>(
      backendUrl.users.details(),
      { method: 'PUT', body: JSON.stringify(data) }
    ));
}

export async function getUserDetails(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryQuery(
    "getUserDetails",
    async () => serverFetch<UsersAPI.UserDetails.GetMe.Response>(backendUrl.users.details()),
  );
}

export async function getMe(): Promise<UsersAPI.GetMe.Response> {
  return withSentryQuery(
    "getMe",
    async () => serverFetch<UsersAPI.GetMe.Response>(backendUrl.users.me()),
  );
}

export async function getUserProgress(): Promise<UsersAPI.Progress.GetMe.Response> {
  return withSentryQuery(
    "getUserProgress",
    async () => serverFetch<UsersAPI.Progress.GetMe.Response>(backendUrl.users.progress()),
  );
}

export async function syncUserTimezone(timezone: string): Promise<void> {
  await withSentryAction("syncUserTimezone", async () => {
    await serverFetch(backendUrl.users.timezone(), {
      method: "PATCH",
      body: JSON.stringify({ timezone }),
    }).catch((error) => {
      Sentry.logger.error("Failed to sync user timezone", { error });
    });
  });
}

export async function updateUserCountry(
  country: string
): Promise<UsersAPI.UpdateCountry.Response> {
  return withSentryAction("updateUserCountry", async () => {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');
    return serverFetch<UsersAPI.UpdateCountry.Response>(
      backendUrl.users.meCountry(),
      { method: 'PATCH', body: JSON.stringify({ country, clerk_user_id: userId }) }
    );
  });
}
