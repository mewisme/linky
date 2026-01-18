import { Logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

const logger = new Logger("SupabaseFavoritesQueries");

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

export async function getFavoritesByUserId(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("favorite_user_id")
    .eq("user_id", userId);

  if (error) {
    logger.error("Error fetching favorites:", error.message);
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
    logger.error("Error checking favorite exists:", error.message);
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
    logger.error("Error creating favorite:", error.message);
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
    logger.error("Error deleting favorite:", error.message);
    throw error;
  }

  return true;
}

export async function getFavoriteLimitForToday(userId: string): Promise<FavoriteLimitRecord | null> {
  const today = new Date().toISOString().split("T")[0];
  if (!today) {
    logger.error("Failed to get today's date");
    throw new Error("Failed to get today's date");
  }

  const { data, error } = await supabase
    .from("user_favorite_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching favorite limit:", error.message);
    throw error;
  }

  return data;
}

export async function incrementFavoriteLimit(userId: string, dailyLimit: number = 10): Promise<FavoriteLimitRecord> {
  const today = new Date().toISOString().split("T")[0];
  if (!today) {
    logger.error("Failed to get today's date");
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
    logger.error("Error incrementing favorite limit:", error.message);
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
      logger.error("Error updating favorite limit:", updateError.message);
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
