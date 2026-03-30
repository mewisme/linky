import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:call-history");

export interface CreateCallHistoryParams {
  callerId: string;
  calleeId: string;
  callerCountry: string | null;
  calleeCountry: string | null;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
}

export interface CallHistoryRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  caller_country: string | null;
  callee_country: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export async function createCallHistory(params: CreateCallHistoryParams): Promise<CallHistoryRecord> {
  const { callerId, calleeId, callerCountry, calleeCountry, startedAt, endedAt, durationSeconds } = params;

  const { data, error } = await supabase
    .from("call_history")
    .insert({
      caller_id: callerId,
      callee_id: calleeId,
      caller_country: callerCountry,
      callee_country: calleeCountry,
      started_at: startedAt.toISOString(),
      ended_at: endedAt?.toISOString() || null,
      duration_seconds: durationSeconds || null,
    })
    .select()
    .single();

  if (error) {
    logger.error(toLoggableError(error), "Error creating call history");
    throw error;
  }

  return data;
}

export async function getCallHistoryByUserId(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: CallHistoryRecord[]; count: number | null }> {
  const { limit = 50, offset = 0 } = options;

  const { data, error, count } = await supabase
    .from("call_history")
    .select("*", { count: "exact" })
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error(toLoggableError(error), "Error fetching call history");
    throw error;
  }

  return { data: data || [], count };
}

export async function getCallHistoryById(id: string): Promise<CallHistoryRecord | null> {
  const { data, error } = await supabase
    .from("call_history")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(toLoggableError(error), "Error fetching call history by ID");
    throw error;
  }

  return data;
}

export async function getUserIdByClerkId(clerkUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(toLoggableError(error), "Error fetching user by Clerk ID");
    throw error;
  }

  return data?.id || null;
}

export async function getCallDurationsForUserOnLocalDate(
  userId: string,
  localDateStr: string,
  tz: string,
): Promise<number> {
  const d = new Date(localDateStr + "T12:00:00Z");
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("call_history")
    .select("ended_at, duration_seconds")
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .not("ended_at", "is", null)
    .not("duration_seconds", "is", null)
    .gte("ended_at", start.toISOString())
    .lt("ended_at", end.toISOString());

  if (error) {
    logger.error(toLoggableError(error), "Error fetching call durations for derive");
    throw error;
  }

  let sum = 0;
  for (const row of data ?? []) {
    const ed = row.ended_at;
    if (!ed) continue;
    const localStr = new Date(ed).toLocaleDateString("sv-SE", { timeZone: tz });
    if (localStr === localDateStr) sum += row.duration_seconds ?? 0;
  }
  return sum;
}

export async function getUserCountry(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("country")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error(toLoggableError(error), "Error fetching user country");
    return null;
  }

  return data?.country || null;
}

