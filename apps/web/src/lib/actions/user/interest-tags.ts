'use server'

import type { UsersAPI } from '@/types/users.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

export async function replaceUserInterestTags(
  tagIds: string[]
): Promise<UsersAPI.UserDetails.InterestTags.Replace.Response> {
  return withSentryAction("replaceUserInterestTags", async () => {
    const result = await serverFetch<UsersAPI.UserDetails.InterestTags.Replace.Response>(
      backendUrl.users.interestTags(),
      { method: 'PUT', body: JSON.stringify({ tagIds }), token: true }
    );
    revalidateTag(cacheTags.userInterestTags, 'max');
    return result;
  });
}

export async function getUserInterestTagsAll(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return withSentryQuery(
    "getUserInterestTagsAll",
    async (token) => serverFetch<UsersAPI.UserDetails.GetMe.Response>(
      backendUrl.users.interestTagsAll(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.userInterestTags], tags: [cacheTags.userInterestTags] },
  );
}
