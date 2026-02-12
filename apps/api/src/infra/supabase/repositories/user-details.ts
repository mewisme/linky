import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

import { createLogger } from "@ws/logger";
import { getInterestTagsByIds } from "./interest-tags.js";
import { supabase } from "@/infra/supabase/client.js";

type UserDetailsInsert = TablesInsert<"user_details">;
type UserDetailsUpdate = TablesUpdate<"user_details">;

const logger = createLogger("infra:supabase:repositories:user-details");

export async function getUserDetailsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("user_details")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user details: %o", error as Error);
    throw error;
  }

  return data;
}

export async function getUserDetailsByUserIds(userIds: string[]) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("user_details")
    .select("user_id, bio, gender, date_of_birth, interest_tags")
    .in("user_id", userIds);

  if (error) {
    logger.error("Error fetching user details batch: %o", error as Error);
    throw error;
  }

  return data || [];
}

export async function getUserDetailsWithTags(userId: string) {
  const { data, error } = await supabase
    .from("user_details_expanded")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user details with tags: %o", error as Error);
    throw error;
  }

  return data;
}

export async function createUserDetails(userId: string, data: Omit<UserDetailsInsert, "user_id">) {
  const { data: created, error } = await supabase
    .from("user_details")
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating user details: %o", error as Error);
    throw error;
  }

  return created;
}

export async function updateUserDetails(userId: string, data: UserDetailsUpdate) {
  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    throw new Error("User details not found");
  }

  const { data: updated, error } = await supabase
    .from("user_details")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating user details: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function patchUserDetails(userId: string, data: Partial<UserDetailsUpdate>) {
  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    throw new Error("User details not found");
  }

  const { data: updated, error } = await supabase
    .from("user_details")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error patching user details: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function getUserWithDetails(userId: string) {
  const { data, error } = await supabase
    .from("users_with_details")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user with details: %o", error as Error);
    throw error;
  }

  return data;
}

export async function getPublicUserInfo(userId: string) {
  const { data, error } = await supabase
    .from("public_user_info")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching public user info: %o", error as Error);
    throw error;
  }

  return data;
}

export async function addInterestTags(userId: string, tagIds: string[]) {
  if (!tagIds || tagIds.length === 0) {
    throw new Error("Tag IDs array cannot be empty");
  }

  const validTags = await getInterestTagsByIds(tagIds);
  if (validTags.length !== tagIds.length) {
    const foundIds = validTags.map((tag) => tag.id);
    const missingIds = tagIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Invalid or inactive tag IDs: ${missingIds.join(", ")}`
    );
  }

  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  const currentTags = existing.interest_tags || [];

  const updatedTags = Array.from(
    new Set([...currentTags, ...tagIds])
  );

  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: updatedTags })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error adding interest tags: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function removeInterestTags(userId: string, tagIds: string[]) {
  if (!tagIds || tagIds.length === 0) {
    throw new Error("Tag IDs array cannot be empty");
  }

  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  const currentTags = existing.interest_tags || [];

  const updatedTags = currentTags.filter((tagId) => !tagIds.includes(tagId));

  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: updatedTags.length > 0 ? updatedTags : null })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error removing interest tags: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function replaceInterestTags(userId: string, tagIds: string[]) {
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  if (tagIds.length === 0) {
    return await clearInterestTags(userId);
  }

  const validTags = await getInterestTagsByIds(tagIds);
  if (validTags.length !== tagIds.length) {
    const foundIds = validTags.map((tag) => tag.id);
    const missingIds = tagIds.filter((id) => !foundIds.includes(id));
    throw new Error(
      `Invalid or inactive tag IDs: ${missingIds.join(", ")}`
    );
  }

  const uniqueTags = Array.from(new Set(tagIds));

  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: uniqueTags })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error replacing interest tags: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function clearInterestTags(userId: string) {
  const existing = await getUserDetailsByUserId(userId);
  if (!existing) {
    throw new Error("User details not found");
  }

  const { data: updated, error } = await supabase
    .from("user_details")
    .update({ interest_tags: null })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error clearing interest tags: %o", error as Error);
    throw error;
  }

  return updated;
}

export async function getInterestTags(userId: string) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("user_details")
    .select("interest_tags")
    .eq("user_id", userId)
    .single();

  if (error) {
    logger.error("Error fetching interest tags: %o", error as Error);
    throw error;
  }

  return data?.interest_tags || [];
}

