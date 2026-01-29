import { CACHE_KEYS, CACHE_TTL } from "./cache-config.js";

import { createLogger } from "@repo/logger";
import { getChangelogs } from "../supabase/repositories/changelogs.js";
import { getInterestTags } from "../supabase/repositories/interest-tags.js";
import { updateCachedData } from "./cache-utils.js";

const logger = createLogger("infra:redis:cache-preload");

export async function preloadReferenceData(): Promise<void> {
  logger.info("Starting cache preload for reference data...");

  try {
    logger.info("Preloading interest tags...");
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

    logger.info(`Preloaded ${interestTagsData.data.length} interest tags`);

    logger.info("Preloading changelogs...");
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

    logger.info(`Preloaded ${changelogsData.data.length} changelogs`);

    logger.info("Cache preload completed successfully");
  } catch (error) {
    logger.error("Cache preload failed: %o", error instanceof Error ? error : new Error(String(error)));
  }
}