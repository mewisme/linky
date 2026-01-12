import { logger } from "../../../utils/logger.js";
import { supabase } from "../client.js";

export interface CreateCallHistoryParams {
  callerId: string; // Database user ID
  calleeId: string; // Database user ID
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

/**
 * Create a call history record
 */
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
    logger.error("Error creating call history:", error.message);
    throw error;
  }

  return data;
}

/**
 * Get call history for a user (as caller or callee)
 */
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
    logger.error("Error fetching call history:", error.message);
    throw error;
  }

  return { data: data || [], count };
}

/**
 * Get a specific call history record by ID
 */
export async function getCallHistoryById(id: string): Promise<CallHistoryRecord | null> {
  const { data, error } = await supabase
    .from("call_history")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    logger.error("Error fetching call history by ID:", error.message);
    throw error;
  }

  return data;
}

/**
 * Get user database ID from Clerk user ID
 */
export async function getUserIdByClerkId(clerkUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // User not found
    }
    logger.error("Error fetching user by Clerk ID:", error.message);
    throw error;
  }

  return data?.id || null;
}

/**
 * Get user country from database user ID
 */
export async function getUserCountry(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("country")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error("Error fetching user country:", error.message);
    return null;
  }

  return data?.country || null;
}
