'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryQuery } from '@/lib/monitoring/with-action';

export async function getChangelogByVersion(
  version: string
): Promise<ResourcesAPI.Changelogs.GetByVersion.Response | null> {
  try {
    return await withSentryQuery(
      "getChangelogByVersion",
      async (_token) => serverFetch<ResourcesAPI.Changelogs.GetByVersion.Response>(
        backendUrl.resources.changelogByVersion(version)
      ),
      { keyParts: [cacheTags.changelog, version], tags: [cacheTags.changelog], revalidate: 3600 },
    );
  } catch {
    return null;
  }
}
