import {
  createLevelReward,
  deleteLevelReward,
  getAllLevelRewards,
  getLevelRewardById,
  updateLevelReward,
} from "../../../infra/supabase/repositories/level-rewards.js";
import type { AdminLevelRewardInsert, AdminLevelRewardUpdate } from "../types/level-reward.types.js";

export async function listLevelRewards() {
  return await getAllLevelRewards();
}

export async function getLevelReward(id: string) {
  return await getLevelRewardById(id);
}

export async function createAdminLevelReward(data: AdminLevelRewardInsert) {
  return await createLevelReward(data as Parameters<typeof createLevelReward>[0]);
}

export async function updateAdminLevelReward(id: string, data: AdminLevelRewardUpdate | Partial<AdminLevelRewardUpdate>) {
  return await updateLevelReward(id, data as Parameters<typeof updateLevelReward>[1]);
}

export async function deleteAdminLevelReward(id: string) {
  return await deleteLevelReward(id);
}
