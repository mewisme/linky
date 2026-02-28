import {
  addInterestTags,
  clearInterestTags,
  createUserDetails,
  getUserDetailsByUserId,
  getUserDetailsWithTags,
  getUserTimezone,
  patchUserDetails,
  removeInterestTags,
  replaceInterestTags,
  setUserTimezoneOnce,
  updateUserDetails,
} from "@/infra/supabase/repositories/user-details.js";

import { REDIS_CACHE_KEYS } from "@/infra/redis/cache/keys.js";
import { BIO_MAX_LENGTH, type UserDetailsUpdate } from "@/domains/user/types/user-details.types.js";
import { getInterestTagsByIds } from "@/infra/supabase/repositories/interest-tags.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { invalidate } from "@/infra/redis/cache/index.js";
import { scheduleEmbeddingRegeneration } from "./embedding-job.service.js";

type UserDetailsUpdateData = Omit<UserDetailsUpdate, "user_id">;

export async function getUserIdByClerkUserId(clerkUserId: string): Promise<string | null> {
  return getUserIdByClerkId(clerkUserId);
}

export async function fetchUserDetailsWithTags(userId: string) {
  return getUserDetailsWithTags(userId);
}

export async function validateInterestTags(interestTags: string[] | null | undefined): Promise<void> {
  if (!interestTags || interestTags.length === 0) {
    return;
  }

  const validTags = await getInterestTagsByIds(interestTags);

  if (validTags.length !== interestTags.length) {
    const validIds = new Set(validTags.map((tag) => tag.id));
    const invalidIds = interestTags.filter((id) => !validIds.has(id));
    throw new Error(`Invalid interest tag IDs: ${invalidIds.join(", ")}`);
  }
}

export function validateDateOfBirth(dateOfBirth: string | null | undefined): void {
  if (!dateOfBirth) {
    return;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  if (birthDate > today) {
    throw new Error("Date of birth cannot be in the future");
  }
}

export function validateBio(bio: string | null | undefined): void {
  if (bio == null || bio === "") {
    return;
  }
  if (typeof bio !== "string" || bio.length > BIO_MAX_LENGTH) {
    throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or less`);
  }
}

export async function putUserDetails(userId: string, updateData: UserDetailsUpdateData) {
  if (updateData.interest_tags !== undefined) {
    await validateInterestTags(updateData.interest_tags);
  }

  if (updateData.date_of_birth !== undefined) {
    validateDateOfBirth(updateData.date_of_birth);
  }

  if (updateData.bio !== undefined) {
    validateBio(updateData.bio);
  }

  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    const created = await createUserDetails(userId, updateData);
    await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
    scheduleEmbeddingRegeneration(userId);
    return created;
  }

  const updated = await updateUserDetails(userId, updateData);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function patchUserDetailsForUser(userId: string, updateData: Partial<UserDetailsUpdateData>) {
  if (updateData.interest_tags !== undefined) {
    await validateInterestTags(updateData.interest_tags);
  }

  if (updateData.date_of_birth !== undefined) {
    validateDateOfBirth(updateData.date_of_birth);
  }

  if (updateData.bio !== undefined) {
    validateBio(updateData.bio);
  }

  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    const created = await createUserDetails(userId, updateData);
    await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
    scheduleEmbeddingRegeneration(userId);
    return created;
  }

  const updated = await patchUserDetails(userId, updateData);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function addUserInterestTags(userId: string, tagIds: string[]) {
  const updated = await addInterestTags(userId, tagIds);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function removeUserInterestTags(userId: string, tagIds: string[]) {
  const updated = await removeInterestTags(userId, tagIds);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function replaceUserInterestTags(userId: string, tagIds: string[]) {
  const updated = await replaceInterestTags(userId, tagIds);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function clearUserInterestTags(userId: string) {
  const updated = await clearInterestTags(userId);
  await invalidate(REDIS_CACHE_KEYS.userProfile(userId));
  scheduleEmbeddingRegeneration(userId);
  return updated;
}

export async function getTimezoneForUser(userId: string): Promise<string> {
  const tz = await getUserTimezone(userId);
  return tz ?? "UTC";
}

export async function setTimezoneOnceForUser(
  userId: string,
  timezone: string
): Promise<{ set: true } | { alreadySet: true }> {
  return setUserTimezoneOnce(userId, timezone);
}

