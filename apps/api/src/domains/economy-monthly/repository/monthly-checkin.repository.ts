import type { MonthlyCheckinRecord } from "@/domains/economy-monthly/types/monthly-checkin.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-monthly:repository:monthly-checkin");

export async function getMonthlyCheckinRecord(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyCheckinRecord | null> {
  const { data, error } = await supabase
    .from("user_monthly_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching monthly checkin record: %o", error as Error);
    throw error;
  }

  return data as MonthlyCheckinRecord | null;
}
