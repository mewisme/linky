import { createLogger } from "@repo/logger";
import { supabase } from "../client.js";

const logger = createLogger("API:Supabase:Favorites:Repository");

export interface FavoriteRecord {
  id: string;
  user_id: string;
  favorite_user_id: string;
  created_at: string | null;
}

export interface FavoriteLimitRecord {
  user_id: string;
  date: string;
  used_count: number;
  daily_limit: number;
  updated_at: string | null;
}

export interface FavoriteWithStats {
  id: string;
  user_id: string;
  favorite_user_id: string;
  created_at: string | null;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  match_count: number;
  total_duration: number;
  average_duration: number;
}

export async function getFavoritesByUserId(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("favorite_user_id")
    .eq("user_id", userId);

  if (error) {
    logger.error("Error fetching favorites: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map((row) => row.favorite_user_id);
}

export async function checkFavoriteExists(userId: string, favoriteUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("favorite_user_id", favoriteUserId)
    .maybeSingle();

  if (error) {
    logger.error("Error checking favorite exists: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data !== null;
}

export async function createFavorite(userId: string, favoriteUserId: string): Promise<FavoriteRecord> {
  const { data, error } = await supabase
    .from("user_favorites")
    .insert({
      user_id: userId,
      favorite_user_id: favoriteUserId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating favorite: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function deleteFavorite(userId: string, favoriteUserId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("favorite_user_id", favoriteUserId);

  if (error) {
    logger.error("Error deleting favorite: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return true;
}

export async function getFavoriteLimitForToday(userId: string): Promise<FavoriteLimitRecord | null> {
  const today = new Date().toISOString().split("T")[0];
  if (!today) {
    logger.error("Failed to get today's date: %o", new Error("Failed to get today's date"));
    throw new Error("Failed to get today's date");
  }

  const { data, error } = await supabase
    .from("user_favorite_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching favorite limit: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data;
}

export async function incrementFavoriteLimit(userId: string, dailyLimit: number = 10): Promise<FavoriteLimitRecord> {
  const today = new Date().toISOString().split("T")[0];
  if (!today) {
    logger.error("Failed to get today's date: %o", new Error("Failed to get today's date"));
    throw new Error("Failed to get today's date");
  }

  const { data, error } = await supabase
    .from("user_favorite_limits")
    .upsert(
      {
        user_id: userId,
        date: today,
        used_count: 1,
        daily_limit: dailyLimit,
      },
      {
        onConflict: "user_id,date",
      }
    )
    .select()
    .single();

  if (error) {
    logger.error("Error incrementing favorite limit: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  if (data.used_count > 1) {
    const { data: updatedData, error: updateError } = await supabase
      .from("user_favorite_limits")
      .update({
        used_count: data.used_count + 1,
      })
      .eq("user_id", userId)
      .eq("date", today)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating favorite limit: %o", updateError instanceof Error ? updateError : new Error(String(updateError)));
      throw updateError;
    }

    return updatedData;
  }

  return data;
}

export async function checkDailyLimitReached(userId: string): Promise<{ reached: boolean; current: number; limit: number }> {
  const limitRecord = await getFavoriteLimitForToday(userId);

  if (!limitRecord) {
    return { reached: false, current: 0, limit: 10 };
  }

  return {
    reached: limitRecord.used_count >= limitRecord.daily_limit,
    current: limitRecord.used_count,
    limit: limitRecord.daily_limit,
  };
}

export async function decrementFavoriteLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  if (!today) {
    logger.error("Failed to get today's date: %o", new Error("Failed to get today's date"));
    throw new Error("Failed to get today's date");
  }

  const limitRecord = await getFavoriteLimitForToday(userId);

  if (!limitRecord || limitRecord.used_count <= 0) {
    return false;
  }

  const { error } = await supabase
    .from("user_favorite_limits")
    .update({
      used_count: Math.max(0, limitRecord.used_count - 1),
    })
    .eq("user_id", userId)
    .eq("date", today);

  if (error) {
    logger.error("Error decrementing favorite limit: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return true;
}

export async function getFavoriteCreationDate(userId: string, favoriteUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("created_at")
    .eq("user_id", userId)
    .eq("favorite_user_id", favoriteUserId)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching favorite creation date: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data?.created_at || null;
}

export async function getFavoritesWithStats(userId: string): Promise<FavoriteWithStats[]> {
  const { data, error } = await supabase
    .from("user_favorites_with_stats")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching favorites with stats: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id || "",
    user_id: row.user_id || "",
    favorite_user_id: row.favorite_user_id || "",
    created_at: row.created_at || new Date().toISOString(),
    clerk_user_id: row.clerk_user_id || "",
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    country: row.country,
    match_count: row.match_count || 0,
    total_duration: row.total_duration || 0,
    average_duration: row.average_duration || 0,
  }));
}

