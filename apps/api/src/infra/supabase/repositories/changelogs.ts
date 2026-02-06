import { createLogger } from "@repo/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:changelogs");

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

export interface ChangelogCreator {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  role: "admin" | "member";
  created_at: string;
  updated_at: string;
}

// Admin changelog record with full creator info (from view)
export interface ChangelogRecord {
  id: string;
  version: string;
  title: string;
  release_date: string;
  s3_key: string;
  created_by: ChangelogCreator;
  is_published: boolean;
  order: number | null;
  created_at: string;
  updated_at: string;
}

// Public changelog record with only creator ID (from table)
export interface PublicChangelogRecord {
  id: string;
  version: string;
  title: string;
  release_date: string;
  s3_key: string;
  created_by: string; // Just the UUID
  is_published: boolean;
  order: number | null;
  created_at: string;
  updated_at: string;
}

export async function createChangelog(params: CreateChangelogParams): Promise<ChangelogRecord> {
  const { version, title, releaseDate, s3Key, createdBy, isPublished = false, order = null } = params;

  // Insert using table (views are read-only)
  const { data: insertResult, error: insertError } = await supabase
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

  if (insertError) {
    logger.error("Error creating changelog: %o", insertError instanceof Error ? insertError : new Error(String(insertError)));
    throw insertError;
  }

  if (!insertResult) {
    throw new Error("Failed to create changelog");
  }

  // Fetch created record from view to get creator info
  const { data, error } = await supabase
    .from("changelogs_with_creator")
    .select("*")
    .eq("id", insertResult.id)
    .single();

  if (error) {
    logger.error("Error fetching created changelog: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  if (!data) {
    throw new Error("Changelog not found after creation");
  }

  return data as unknown as ChangelogRecord;
}

// Public functions - return created_by as UUID only
export async function getChangelogs(
  options: { limit?: number; offset?: number; orderBy?: "release_date" | "order" } = {}
): Promise<{ data: PublicChangelogRecord[]; count: number | null }> {
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
    logger.error("Error fetching changelogs: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: data || [], count };
}

export async function getChangelogByVersion(version: string): Promise<PublicChangelogRecord | null> {
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
    logger.error("Error fetching changelog by version: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function getChangelogById(id: string): Promise<ChangelogRecord | null> {
  const { data, error } = await supabase
    .from("changelogs_with_creator")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching changelog by ID: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data as unknown as ChangelogRecord;
}

export async function updateChangelog(id: string, params: UpdateChangelogParams): Promise<ChangelogRecord> {
  const updateData: Record<string, unknown> = {};

  if (params.version !== undefined) updateData.version = params.version;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.releaseDate !== undefined) updateData.release_date = params.releaseDate.toISOString();
  if (params.s3Key !== undefined) updateData.s3_key = params.s3Key;
  if (params.isPublished !== undefined) updateData.is_published = params.isPublished;
  if (params.order !== undefined) updateData.order = params.order;

  // Update using table (views are read-only)
  const { data: updateResult, error: updateError } = await supabase
    .from("changelogs")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    logger.error("Error updating changelog: %o", updateError instanceof Error ? updateError : new Error(String(updateError)));
    throw updateError;
  }

  if (!updateResult) {
    throw new Error("Changelog not found");
  }

  // Fetch updated record from view to get creator info
  const { data, error } = await supabase
    .from("changelogs_with_creator")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Error fetching updated changelog: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  if (!data) {
    throw new Error("Changelog not found");
  }

  return data as unknown as ChangelogRecord;
}

export async function deleteChangelog(id: string): Promise<void> {
  const { error } = await supabase.from("changelogs").delete().eq("id", id);

  if (error) {
    logger.error("Error deleting changelog: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getAllChangelogsForAdmin(
  options: { limit?: number; offset?: number; orderBy?: "release_date" | "order" } = {}
): Promise<{ data: ChangelogRecord[]; count: number | null }> {
  const { limit = 50, offset = 0, orderBy = "release_date" } = options;

  let query = supabase.from("changelogs_with_creator").select("*", { count: "exact" });

  if (orderBy === "order") {
    query = query.order("order", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("release_date", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error("Error fetching all changelogs for admin: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return { data: (data || []) as unknown as ChangelogRecord[], count };
}

