'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/sentry/with-action';

export async function getInterestTags(
  params?: URLSearchParams
): Promise<ResourcesAPI.InterestTags.Get.Response> {
  const key = params?.toString() ?? '';
  return withSentryQuery(
    "getInterestTags",
    async (token) => serverFetch<ResourcesAPI.InterestTags.Get.Response>(
      backendUrl.resources.interestTags(params), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.interestTagsPublic, key], tags: [cacheTags.interestTagsPublic] },
  );
}
