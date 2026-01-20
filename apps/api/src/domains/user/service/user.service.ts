import { supabase } from "../../../infra/supabase/client.js";
import type { Tables } from "../../../types/database/supabase.types.js";

export async function fetchUserByClerkUserId(clerkUserId: string): Promise<{
  user: Tables<"users"> | null;
  error: { message: string; code?: string } | null;
}> {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return { user, error };
}

export async function tryUpdateUserCountryFromHeader(
  clerkUserId: string,
  country: string,
): Promise<{
  updatedUser: Tables<"users"> | null;
  updateError: { message: string } | null;
}> {
  const { error: updateError } = await supabase
    .from("users")
    .update({
      country,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", clerkUserId);

  if (updateError) {
    return { updatedUser: null, updateError };
  }

  const { data: updatedUser } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return { updatedUser, updateError: null };
}

export async function updateUserCountryByClerkUserId(
  clerkUserId: string,
  country: string,
): Promise<{
  user: Tables<"users"> | null;
  error: { message: string } | null;
}> {
  const { data: user, error } = await supabase
    .from("users")
    .update({
      country,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", clerkUserId)
    .select()
    .single();

  return { user, error };
}

