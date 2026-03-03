'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getInterestTags(
  params?: ServerActionQueryParams
): Promise<ResourcesAPI.InterestTags.Get.Response> {
  const searchParams = toURLSearchParams(params);
  const key = searchParams?.toString() ?? '';
  return withSentryQuery(
    "getInterestTags",
    async (token) => serverFetch<ResourcesAPI.InterestTags.Get.Response>(
      backendUrl.resources.interestTags(searchParams), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.interestTagsPublic, key], tags: [cacheTags.interestTagsPublic] },
  );
}
