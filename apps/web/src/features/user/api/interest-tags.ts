'use server'

import 'server-only';

import type { UsersAPI } from '@/entities/user/types/users.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function replaceUserInterestTags(
  tagIds: string[]
): Promise<UsersAPI.UserDetails.InterestTags.Replace.Response> {
  return withSentryAction("replaceUserInterestTags", async () =>
    serverFetch<UsersAPI.UserDetails.InterestTags.Replace.Response>(
      backendUrl.users.interestTags(),
      { method: 'PUT', body: JSON.stringify({ tagIds }) }
    ));
}

export async function getUserInterestTagsAll(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryQuery(
    "getUserInterestTagsAll",
    async () => serverFetch<UsersAPI.UserDetails.GetMe.Response>(backendUrl.users.interestTagsAll()),
  );
}
