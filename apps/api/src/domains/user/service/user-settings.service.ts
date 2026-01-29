import {
  createUserSettings,
  getUserSettingsByUserId,
  patchUserSettings,
  updateUserSettings,
} from "../../../infra/supabase/repositories/user-settings.js";

import { REDIS_CACHE_KEYS } from "../../../infra/redis/cache/keys.js";
import type { UserSettingsUpdate } from "../types/user-settings.types.js";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { invalidate } from "../../../infra/redis/cache/index.js";

type UserSettingsUpdateData = Omit<UserSettingsUpdate, "user_id">;

export async function getUserIdByClerkUserId(clerkUserId: string): Promise<string | null> {
  return getUserIdByClerkId(clerkUserId);
}

export async function fetchUserSettings(userId: string) {
  return getUserSettingsByUserId(userId);
}

export async function putUserSettings(userId: string, updateData: UserSettingsUpdateData) {
  const existing = await getUserSettingsByUserId(userId);

  if (!existing) {
    const created = await createUserSettings(userId, updateData);
    await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
    return created;
  }

  const updated = await updateUserSettings(userId, updateData);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  return updated;
}

export async function patchUserSettingsForUser(userId: string, updateData: Partial<UserSettingsUpdateData>) {
  const existing = await getUserSettingsByUserId(userId);

  if (!existing) {
    const created = await createUserSettings(userId, updateData);
    await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
    return created;
  }

  const updated = await patchUserSettings(userId, updateData);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  return updated;
}

