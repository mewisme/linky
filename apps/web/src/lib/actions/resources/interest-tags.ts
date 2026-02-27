'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';

export async function getInterestTags(
  params?: URLSearchParams
): Promise<ResourcesAPI.InterestTags.Get.Response> {
  return serverFetch(backendUrl.resources.interestTags(params), { token: true });
}
