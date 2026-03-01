'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/monitoring/with-action';

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
