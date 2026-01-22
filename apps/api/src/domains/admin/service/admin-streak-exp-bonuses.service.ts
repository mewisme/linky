import {
  createStreakExpBonus,
  deleteStreakExpBonus,
  getAllStreakExpBonuses,
  getStreakExpBonusById,
  updateStreakExpBonus,
} from "../../../infra/supabase/repositories/streak-exp-bonuses.js";
import type { AdminStreakExpBonusInsert, AdminStreakExpBonusUpdate } from "../types/streak-exp-bonus.types.js";

export async function listStreakExpBonuses() {
  return await getAllStreakExpBonuses();
}

export async function getStreakExpBonus(id: string) {
  return await getStreakExpBonusById(id);
}

export async function createAdminStreakExpBonus(data: AdminStreakExpBonusInsert) {
  return await createStreakExpBonus(data);
}

export async function updateAdminStreakExpBonus(id: string, data: AdminStreakExpBonusUpdate | Partial<AdminStreakExpBonusUpdate>) {
  return await updateStreakExpBonus(id, data);
}

export async function deleteAdminStreakExpBonus(id: string) {
  return await deleteStreakExpBonus(id);
}
