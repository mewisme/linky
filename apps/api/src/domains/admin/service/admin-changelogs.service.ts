import {
  createChangelog,
  deleteChangelog,
  getAllChangelogsForAdmin,
  getChangelogById,
  updateChangelog,
  type CreateChangelogParams,
  type UpdateChangelogParams,
} from "../../../infra/supabase/repositories/changelogs.js";

export type { CreateChangelogParams, UpdateChangelogParams } from "../../../infra/supabase/repositories/changelogs.js";

export async function listChangelogs(params: { limit: number; offset: number; orderBy: "release_date" | "order" }) {
  return await getAllChangelogsForAdmin(params);
}

export async function getChangelog(id: string) {
  return await getChangelogById(id);
}

export async function createAdminChangelog(params: CreateChangelogParams) {
  return await createChangelog(params);
}

export async function updateAdminChangelog(id: string, params: UpdateChangelogParams) {
  return await updateChangelog(id, params);
}

export async function deleteAdminChangelog(id: string) {
  return await deleteChangelog(id);
}

