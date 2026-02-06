import type {
  AdminInterestTagInsert,
  AdminInterestTagUpdate,
  InterestTagsImportRequestBody,
  InterestTagsImportResponse,
} from "@/domains/admin/types/admin.types.js";
import {
  createInterestTag,
  deleteInterestTag,
  deleteInterestTagHard,
  getInterestTagById,
  getInterestTags,
  updateInterestTag,
} from "@/infra/supabase/repositories/interest-tags.js";

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

function isValidString(s: unknown, maxLen?: number): s is string {
  return typeof s === "string" && (maxLen === undefined || s.length <= maxLen);
}

function isValidBoolean(b: unknown): b is boolean {
  return typeof b === "boolean";
}

export async function importInterestTags(body: InterestTagsImportRequestBody): Promise<InterestTagsImportResponse> {
  const total = body.items?.length ?? 0;
  let created = 0;
  let updated = 0;
  let skipped_invalid = 0;

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return { total: 0, created: 0, updated: 0, skipped_invalid: 0 };
  }

  const { data: existingRows } = await getInterestTags({
    isActive: undefined,
    limit: 10000,
    offset: 0,
  });
  const existingByKey = new Map<string, string>(
    existingRows.map((r) => [(r.name ?? "").trim().toLowerCase(), r.id])
  );

  for (const item of items) {
    const rawName = item?.display_name;
    const d = typeof rawName === "string" ? rawName.trim() : "";
    const key = d.toLowerCase();

    if (d.length === 0) {
      skipped_invalid += 1;
      continue;
    }
    if (d.length > 100) {
      skipped_invalid += 1;
      continue;
    }

    if (item.category !== undefined && !isValidString(item.category, 50)) {
      skipped_invalid += 1;
      continue;
    }
    if (item.icon !== undefined && !isValidString(item.icon, 50)) {
      skipped_invalid += 1;
      continue;
    }
    if (item.description !== undefined && typeof item.description !== "string") {
      skipped_invalid += 1;
      continue;
    }
    if (item.is_active !== undefined && !isValidBoolean(item.is_active)) {
      skipped_invalid += 1;
      continue;
    }

    const existingId = existingByKey.get(key);

    if (existingId) {
      const up: Parameters<typeof updateInterestTag>[1] = {};
      if ("category" in item) up.category = item.category ?? null;
      if ("icon" in item) up.icon = item.icon ?? null;
      if ("description" in item) up.description = item.description ?? null;
      if ("is_active" in item) up.is_active = item.is_active;
      if (Object.keys(up).length > 0) {
        await updateInterestTag(existingId, up);
      }
      updated += 1;
    } else {
      const inserted = await createInterestTag({
        name: d,
        category: item.category ?? null,
        icon: item.icon ?? null,
        description: item.description ?? null,
        is_active: item.is_active ?? true,
      });
      created += 1;
      existingByKey.set(key, inserted.id);
    }
  }

  return { total, created, updated, skipped_invalid };
}

