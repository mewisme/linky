'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getInterestTags(
  params?: URLSearchParams
): Promise<ResourcesAPI.InterestTags.Get.Response> {
  return withSentryAction("getInterestTags", async () => {
    trackEventServer({ name: 'api_resources_interest_tags_get' });
    return serverFetch(backendUrl.resources.interestTags(params), { token: true });
  });
}
