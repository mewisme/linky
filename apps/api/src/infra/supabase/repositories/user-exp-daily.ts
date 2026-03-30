import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:user-exp-daily");

export interface UserExpDailyRecord {
  id: string;
  user_id: string;
  date: string;
  exp_seconds: number;
  created_at: string;
  updated_at: string;
}

export async function incrementUserExpDaily(
  userId: string,
  date: string,
  expSeconds: number,
): Promise<void> {
  if (expSeconds <= 0) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logger.error("Invalid date format: %s", date);
    throw new Error("date must be YYYY-MM-DD");
  }

  const { error } = await supabase.rpc("increment_user_exp_daily", {
    p_user_id: userId,
    p_date: date,
    p_exp_seconds: expSeconds,
  });

  if (error) {
    logger.error(toLoggableError(error), "Error incrementing user exp daily");
    throw error;
  }
}

export async function incrementDailyExpWithMilestones(
  userId: string,
  date: string,
  expSeconds: number,
): Promise<void> {
  if (expSeconds <= 0) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logger.error("Invalid date format: %s", date);
    throw new Error("date must be YYYY-MM-DD");
  }

  const { error } = await supabase.rpc("increment_daily_exp_with_milestones", {
    p_user_id: userId,
    p_date: date,
    p_exp_seconds: expSeconds,
  });

  if (error) {
    logger.error(toLoggableError(error), "Error incrementing daily exp with milestones");
    throw error;
  }
}

export async function getUserExpDaily(
  userId: string,
  date: string,
): Promise<number> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 0;
  }

  const { data, error } = await supabase
    .from("user_exp_daily")
    .select("exp_seconds")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return 0;
    }
    logger.error(toLoggableError(error), "Error fetching user exp daily");
    throw error;
  }

  return data?.exp_seconds ?? 0;
}
