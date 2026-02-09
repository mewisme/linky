import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:broadcast-history");

export interface BroadcastHistoryRecord {
  id: string;
  created_by_user_id: string;
  title: string | null;
  message: string;
  created_at: string;
}

export interface BroadcastHistoryRowWithCreator extends BroadcastHistoryRecord {
  creator_first_name: string | null;
  creator_last_name: string | null;
  creator_email: string | null;
}

export interface ListBroadcastHistoryParams {
  limit?: number;
  offset?: number;
}

export interface ListBroadcastHistoryResult {
  data: BroadcastHistoryRowWithCreator[];
  total: number;
}

export async function createBroadcastHistory(params: {
  created_by_user_id: string;
  title: string | null;
  message: string;
}): Promise<BroadcastHistoryRecord> {
  const { data, error } = await supabase
    .from("broadcast_history")
    .insert({
      created_by_user_id: params.created_by_user_id,
      title: params.title,
      message: params.message,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating broadcast history: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return data as BroadcastHistoryRecord;
}

export async function listBroadcastHistory(
  params: ListBroadcastHistoryParams = {}
): Promise<ListBroadcastHistoryResult> {
  const { limit = 50, offset = 0 } = params;
  const from = offset;
  const to = offset + limit - 1;

  const { data: rows, error, count } = await supabase
    .from("broadcast_history")
    .select(
      "id, created_by_user_id, title, message, created_at, users!broadcast_history_created_by_fkey(first_name, last_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    logger.error("Error listing broadcast history: %o", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const withCreator: BroadcastHistoryRowWithCreator[] = (rows || []).map((row: Record<string, unknown>) => {
    const users = row.users as { first_name: string | null; last_name: string | null; email: string | null } | null;
    const { users: _u, ...rest } = row;
    return {
      ...rest,
      creator_first_name: users?.first_name ?? null,
      creator_last_name: users?.last_name ?? null,
      creator_email: users?.email ?? null,
    } as BroadcastHistoryRowWithCreator;
  });

  return {
    data: withCreator,
    total: count ?? 0,
  };
}
