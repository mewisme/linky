import {
  createLevelFeatureUnlock,
  deleteLevelFeatureUnlock,
  getAllLevelFeatureUnlocks,
  getLevelFeatureUnlockById,
  updateLevelFeatureUnlock,
} from "../../../infra/supabase/repositories/level-feature-unlocks.js";
import type {
  AdminLevelFeatureUnlockInsert,
  AdminLevelFeatureUnlockUpdate,
} from "../types/level-feature-unlock.types.js";

export async function listLevelFeatureUnlocks() {
  return await getAllLevelFeatureUnlocks();
}

export async function getLevelFeatureUnlock(id: string) {
  return await getLevelFeatureUnlockById(id);
}

export async function createAdminLevelFeatureUnlock(data: AdminLevelFeatureUnlockInsert) {
  return await createLevelFeatureUnlock(data as Parameters<typeof createLevelFeatureUnlock>[0]);
}

export async function updateAdminLevelFeatureUnlock(
  id: string,
  data: AdminLevelFeatureUnlockUpdate | Partial<AdminLevelFeatureUnlockUpdate>,
) {
  return await updateLevelFeatureUnlock(id, data as Parameters<typeof updateLevelFeatureUnlock>[1]);
}

export async function deleteAdminLevelFeatureUnlock(id: string) {
  return await deleteLevelFeatureUnlock(id);
}
