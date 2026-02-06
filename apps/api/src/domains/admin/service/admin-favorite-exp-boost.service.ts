import {
  createFavoriteExpBoostRules as createFavoriteExpBoostRulesRepo,
  deleteFavoriteExpBoostRules as deleteFavoriteExpBoostRulesRepo,
  getAllFavoriteExpBoostRules,
  getFavoriteExpBoostRulesById,
  updateFavoriteExpBoostRules as updateFavoriteExpBoostRulesRepo,
} from "@/infra/supabase/repositories/favorite-exp-boost-rules.js";

export async function listFavoriteExpBoostRules() {
  return await getAllFavoriteExpBoostRules();
}

export async function getFavoriteExpBoostRules(id: string) {
  return await getFavoriteExpBoostRulesById(id);
}

export async function createFavoriteExpBoostRules(data: { one_way_multiplier: number; mutual_multiplier: number }) {
  return await createFavoriteExpBoostRulesRepo(data);
}

export async function updateFavoriteExpBoostRules(
  id: string,
  data: { one_way_multiplier?: number; mutual_multiplier?: number },
) {
  return await updateFavoriteExpBoostRulesRepo(id, data);
}

export async function deleteFavoriteExpBoostRules(id: string) {
  return await deleteFavoriteExpBoostRulesRepo(id);
}
