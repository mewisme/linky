import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

import { createLogger } from "@repo/logger";
import { getChangelogs } from "@/infra/supabase/repositories/changelogs.js";
import { getInterestTags } from "@/infra/supabase/repositories/interest-tags.js";
import { updateCachedData } from "@/infra/redis/cache-utils.js";

const logger = createLogger("infra:redis:cache-preload");

export async function preloadReferenceData(): Promise<void> {
  try {
    const interestTagsData = await getInterestTags({
      isActive: true,
      limit: 1000,
      offset: 0,
    });

    await updateCachedData(
      CACHE_KEYS.interestTags(),
      interestTagsData,
      CACHE_TTL.INTEREST_TAGS
    );

    for (const tag of interestTagsData.data) {
      await updateCachedData(
        CACHE_KEYS.interestTag(tag.id),
        tag,
        CACHE_TTL.INTEREST_TAGS
      );
    }

    const changelogsData = await getChangelogs({
      limit: 1000,
      offset: 0,
    });

    await updateCachedData(
      CACHE_KEYS.changelogs(),
      changelogsData,
      CACHE_TTL.CHANGELOGS
    );

    for (const changelog of changelogsData.data) {
      await updateCachedData(
        CACHE_KEYS.changelog(changelog.version),
        changelog,
        CACHE_TTL.CHANGELOGS
      );
    }

    logger.info("Cache preload completed: interest_tags=%d changelogs=%d", interestTagsData.data.length, changelogsData.data.length);
  } catch (error) {
    logger.error("Cache preload failed: %o", error instanceof Error ? error : new Error(String(error)));
  }
}