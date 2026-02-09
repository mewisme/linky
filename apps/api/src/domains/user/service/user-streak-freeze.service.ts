import {
  addAvailableFreezes,
  getGrantedFreezeUnlockIds,
  insertFreezeGrant,
} from "@/infra/supabase/repositories/user-streak-freeze.js";

import { createLogger } from "@ws/logger";
import { getLevelFeatureUnlocksAtLevel } from "@/infra/supabase/repositories/level-feature-unlocks.js";

const logger = createLogger("api:user:streak-freeze:service");

const STREAK_FREEZE_FEATURE_KEY = "streak_freeze";

export async function grantFreezesForLevel(userId: string, level: number): Promise<void> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") return;
  if (level <= 0) return;

  try {
    const unlocks = await getLevelFeatureUnlocksAtLevel(level);
    const freezeUnlocks = unlocks.filter((u) => u.feature_key === STREAK_FREEZE_FEATURE_KEY);
    if (freezeUnlocks.length === 0) return;

    const grantedIds = await getGrantedFreezeUnlockIds(userId);
    for (const unlock of freezeUnlocks) {
      if (grantedIds.includes(unlock.id)) continue;
      const count = Math.max(0, Math.floor(Number((unlock.feature_payload as { freezes_granted?: number })?.freezes_granted ?? 1)));
      if (count <= 0) continue;
      await addAvailableFreezes(userId, count);
      await insertFreezeGrant(userId, unlock.id);
      logger.info("Granted %d streak freezes to user %s from level unlock %s", count, userId, unlock.id);
    }
  } catch (error) {
    logger.error(
      "Error granting freezes for level: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
