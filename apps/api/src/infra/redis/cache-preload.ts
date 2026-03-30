import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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

    logger.info("Cache preload completed: interest_tags=%d", interestTagsData.data.length);
  } catch (error) {
    logger.error(toLoggableError(error), "Cache preload failed");
  }
}