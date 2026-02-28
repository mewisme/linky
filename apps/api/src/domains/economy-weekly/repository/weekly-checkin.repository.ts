import type { WeeklyCheckinRecord } from "@/domains/economy-weekly/types/weekly-checkin.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-weekly:repository:weekly-checkin");

export async function getWeeklyCheckinRecord(
  userId: string
): Promise<WeeklyCheckinRecord | null> {
  const { data, error } = await supabase
    .from("user_weekly_checkins")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching weekly checkin record: %o", error as Error);
    throw error;
  }

  return data as WeeklyCheckinRecord | null;
}
