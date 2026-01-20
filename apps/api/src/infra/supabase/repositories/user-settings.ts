import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

import { Logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

type UserSettingsInsert = TablesInsert<"user_settings">;
type UserSettingsUpdate = TablesUpdate<"user_settings">;

const logger = new Logger("SupabaseUserSettingsQueries");

export async function getUserSettingsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Error fetching user settings:", error.message);
    throw error;
  }

  return data;
}

export async function createUserSettings(userId: string, data: Omit<UserSettingsInsert, "user_id">) {
  const { data: created, error } = await supabase
    .from("user_settings")
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating user settings:", error.message);
    throw error;
  }

  return created;
}

export async function updateUserSettings(userId: string, data: UserSettingsUpdate) {
  const existing = await getUserSettingsByUserId(userId);

  if (!existing) {
    throw new Error("User settings not found");
  }

  const { data: updated, error } = await supabase
    .from("user_settings")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating user settings:", error.message);
    throw error;
  }

  return updated;
}

export async function patchUserSettings(userId: string, data: Partial<UserSettingsUpdate>) {
  const existing = await getUserSettingsByUserId(userId);

  if (!existing) {
    throw new Error("User settings not found");
  }

  const { data: updated, error } = await supabase
    .from("user_settings")
    .update(data)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Error patching user settings:", error.message);
    throw error;
  }

  return updated;
}

