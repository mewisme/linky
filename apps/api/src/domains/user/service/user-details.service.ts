import type { UserDetailsUpdate } from "../types/user-details.types.js";
import {
  addInterestTags,
  clearInterestTags,
  createUserDetails,
  getUserDetailsByUserId,
  getUserDetailsWithTags,
  patchUserDetails,
  removeInterestTags,
  replaceInterestTags,
  updateUserDetails,
} from "../../../infra/supabase/repositories/user-details.js";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { getInterestTagsByIds } from "../../../infra/supabase/repositories/interest-tags.js";

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

export async function putUserDetails(userId: string, updateData: UserDetailsUpdateData) {
  if (updateData.interest_tags !== undefined) {
    await validateInterestTags(updateData.interest_tags);
  }

  if (updateData.date_of_birth !== undefined) {
    validateDateOfBirth(updateData.date_of_birth);
  }

  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    return createUserDetails(userId, updateData);
  }

  return updateUserDetails(userId, updateData);
}

export async function patchUserDetailsForUser(userId: string, updateData: Partial<UserDetailsUpdateData>) {
  if (updateData.interest_tags !== undefined) {
    await validateInterestTags(updateData.interest_tags);
  }

  if (updateData.date_of_birth !== undefined) {
    validateDateOfBirth(updateData.date_of_birth);
  }

  const existing = await getUserDetailsByUserId(userId);

  if (!existing) {
    return createUserDetails(userId, updateData);
  }

  return patchUserDetails(userId, updateData);
}

export async function addUserInterestTags(userId: string, tagIds: string[]) {
  return addInterestTags(userId, tagIds);
}

export async function removeUserInterestTags(userId: string, tagIds: string[]) {
  return removeInterestTags(userId, tagIds);
}

export async function replaceUserInterestTags(userId: string, tagIds: string[]) {
  return replaceInterestTags(userId, tagIds);
}

export async function clearUserInterestTags(userId: string) {
  return clearInterestTags(userId);
}

