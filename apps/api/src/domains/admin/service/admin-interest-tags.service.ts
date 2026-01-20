import {
  createInterestTag,
  deleteInterestTag,
  deleteInterestTagHard,
  getInterestTagById,
  getInterestTags,
  updateInterestTag,
} from "../../../infra/supabase/repositories/interest-tags.js";
import type { AdminInterestTagInsert, AdminInterestTagUpdate } from "../types/admin.types.js";

export async function listInterestTags(params: {
  category?: string;
  search?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
}) {
  return await getInterestTags({
    category: params.category,
    isActive: params.isActive,
    search: params.search,
    limit: params.limit,
    offset: params.offset,
  });
}

export async function getInterestTag(id: string) {
  return await getInterestTagById(id);
}

export async function createAdminInterestTag(tagData: AdminInterestTagInsert) {
  return await createInterestTag(tagData);
}

export async function updateAdminInterestTag(id: string, tagData: AdminInterestTagUpdate | Partial<AdminInterestTagUpdate>) {
  return await updateInterestTag(id, tagData);
}

export async function softDeleteInterestTag(id: string) {
  return await deleteInterestTag(id);
}

export async function hardDeleteInterestTag(id: string) {
  return await deleteInterestTagHard(id);
}

