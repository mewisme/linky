import type { UserUnlockedFeatures } from "@/domains/user/types/level-feature-unlock.types.js";
import { createLogger } from "@ws/logger";
import { getLevelFeatureUnlocksUpToLevel } from "@/infra/supabase/repositories/level-feature-unlocks.js";

const logger = createLogger("api:user:feature-unlock:service");

export async function getUserUnlockedFeatures(userId: string, level: number): Promise<UserUnlockedFeatures> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return {};
  }

  if (level <= 0) {
    return {};
  }

  try {
    const unlocks = await getLevelFeatureUnlocksUpToLevel(level);
    const features: UserUnlockedFeatures = {};

    for (const unlock of unlocks) {
      if (!features[unlock.feature_key]) {
        features[unlock.feature_key] = {
          unlocked: true,
          levelRequired: unlock.level_required,
          featurePayload: unlock.feature_payload as Record<string, unknown>,
        };
      } else {
        const existing = features[unlock.feature_key];
        if (existing && unlock.level_required > existing.levelRequired) {
          features[unlock.feature_key] = {
            unlocked: true,
            levelRequired: unlock.level_required,
            featurePayload: unlock.feature_payload as Record<string, unknown>,
          };
        }
      }
    }

    return features;
  } catch (error) {
    logger.error("Error getting user unlocked features: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
