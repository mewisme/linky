'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function replaceUserInterestTags(
  tagIds: string[]
): Promise<UsersAPI.UserDetails.InterestTags.Replace.Response> {
  return withSentryAction("replaceUserInterestTags", async () => {
    trackEventServer({ name: 'api_users_interest_tags_put', properties: { count: tagIds.length } });
    return serverFetch(backendUrl.users.interestTags(), {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
      token: true,
    });
  });
}

export async function getUserInterestTagsAll(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryAction("getUserInterestTagsAll", async () => {
    trackEventServer({ name: 'api_users_interest_tags_all_get' });
    return serverFetch(backendUrl.users.interestTagsAll(), { token: true });
  });
}
