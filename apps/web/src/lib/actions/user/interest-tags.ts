'use server'

import type { UsersAPI } from '@/types/users.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function replaceUserInterestTags(
  tagIds: string[]
): Promise<UsersAPI.UserDetails.InterestTags.Replace.Response> {
  return serverFetch(backendUrl.users.interestTags(), {
    method: 'POST',
    body: JSON.stringify({ tagIds }),
    token: true,
  });
}

export async function getUserInterestTagsAll(): Promise<UsersAPI.UserDetails.GetMe.Response> {
  return serverFetch(backendUrl.users.interestTagsAll(), { token: true });
}
