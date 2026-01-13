import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

export interface CreateChangelogParams {
  version: string;
  title: string;
  releaseDate: Date;
  s3Key: string;
  createdBy: string;
  isPublished?: boolean;
  order?: number | null;
}

export interface UpdateChangelogParams {
  version?: string;
  title?: string;
  releaseDate?: Date;
  s3Key?: string;
  isPublished?: boolean;
  order?: number | null;
}

export interface ChangelogRecord {
  id: string;
  version: string;
  title: string;
  release_date: string;
  s3_key: string;
  created_by: string;
  is_published: boolean;
  order: number | null;
  created_at: string;
  updated_at: string;
}

export async function createChangelog(params: CreateChangelogParams): Promise<ChangelogRecord> {
  const { version, title, releaseDate, s3Key, createdBy, isPublished = false, order = null } = params;

  const { data, error } = await supabase
    .from("changelogs")
    .insert({
      version,
      title,
      release_date: releaseDate.toISOString(),
      s3_key: s3Key,
      created_by: createdBy,
      is_published: isPublished,
      order,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating changelog:", error.message);
    throw error;
  }

  return data;
}

export async function getChangelogs(
  options: { limit?: number; offset?: number; orderBy?: "release_date" | "order" } = {}
): Promise<{ data: ChangelogRecord[]; count: number | null }> {
  const { limit = 50, offset = 0, orderBy = "release_date" } = options;

  let query = supabase
    .from("changelogs")
    .select("*", { count: "exact" })
    .eq("is_published", true);

  if (orderBy === "order") {
    query = query.order("order", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("release_date", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error("Error fetching changelogs:", error.message);
    throw error;
  }

  return { data: data || [], count };
}

export async function getChangelogByVersion(version: string): Promise<ChangelogRecord | null> {
  const { data, error } = await supabase
    .from("changelogs")
    .select("*")
    .eq("version", version)
    .eq("is_published", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching changelog by version:", error.message);
    throw error;
  }

  return data;
}

export async function getChangelogById(id: string): Promise<ChangelogRecord | null> {
  const { data, error } = await supabase
    .from("changelogs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching changelog by ID:", error.message);
    throw error;
  }

  return data;
}

export async function updateChangelog(id: string, params: UpdateChangelogParams): Promise<ChangelogRecord> {
  const updateData: Record<string, unknown> = {};

  if (params.version !== undefined) updateData.version = params.version;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.releaseDate !== undefined) updateData.release_date = params.releaseDate.toISOString();
  if (params.s3Key !== undefined) updateData.s3_key = params.s3Key;
  if (params.isPublished !== undefined) updateData.is_published = params.isPublished;
  if (params.order !== undefined) updateData.order = params.order;

  const { data, error } = await supabase
    .from("changelogs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating changelog:", error.message);
    throw error;
  }

  if (!data) {
    throw new Error("Changelog not found");
  }

  return data;
}

export async function deleteChangelog(id: string): Promise<void> {
  const { error } = await supabase.from("changelogs").delete().eq("id", id);

  if (error) {
    logger.error("Error deleting changelog:", error.message);
    throw error;
  }
}

export async function getAllChangelogsForAdmin(
  options: { limit?: number; offset?: number; orderBy?: "release_date" | "order" } = {}
): Promise<{ data: ChangelogRecord[]; count: number | null }> {
  const { limit = 50, offset = 0, orderBy = "release_date" } = options;

  let query = supabase.from("changelogs").select("*", { count: "exact" });

  if (orderBy === "order") {
    query = query.order("order", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("release_date", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error("Error fetching all changelogs for admin:", error.message);
    throw error;
  }

  return { data: data || [], count };
}
