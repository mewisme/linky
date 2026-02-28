import type { DailyExpRecord } from "@/domains/economy-daily/types/daily-exp.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-daily:repository:daily-exp");

export async function getDailyExpRecord(
  userId: string,
  localDate: string
): Promise<DailyExpRecord | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_exp_daily")
    .select("*")
    .eq("user_id", userId)
    .eq("date", localDate)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching daily exp record: %o", error as Error);
    throw error;
  }

  return data as DailyExpRecord | null;
}
