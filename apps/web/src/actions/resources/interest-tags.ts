'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryQuery } from '@/lib/monitoring/with-action';
import { toURLSearchParams, type ServerActionQueryParams } from '@/lib/http/query-params';

export async function getInterestTags(
  params?: ServerActionQueryParams
): Promise<ResourcesAPI.InterestTags.Get.Response> {
  const searchParams = toURLSearchParams(params);
  return withSentryQuery(
    "getInterestTags",
    async () => serverFetch<ResourcesAPI.InterestTags.Get.Response>(backendUrl.resources.interestTags(searchParams)),
  );
}
