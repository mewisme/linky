import type { Database } from "@/types/database/supabase.types.js";
import { createLogger } from "@repo/logger";
import { supabase } from "@/infra/supabase/client.js";

type AdminUsersUnifiedRow = Database["public"]["Views"]["admin_users_unified"]["Row"];

const logger = createLogger("infra:supabase:repositories:admin-users");

export interface GetAdminUsersUnifiedOptions {
  page?: number;
  limit?: number;
  role?: "admin" | "member";
  deleted?: boolean;
  search?: string;
  getAll?: boolean;
}

export interface GetAdminUsersUnifiedResult {
  data: AdminUsersUnifiedRow[];
  count: number | null;
}

export async function getAdminUsersUnified(
  options: GetAdminUsersUnifiedOptions = {}
): Promise<GetAdminUsersUnifiedResult> {
  const { page = 1, limit = 50, role, deleted, search, getAll = false } = options;
  const maxLimit = Math.min(limit, 100);
  const offset = (page - 1) * maxLimit;

  let query = supabase
    .from("admin_users_unified")
    .select("*", { count: "exact" });

  if (role === "admin" || role === "member") {
    query = query.eq("role", role);
  }

  if (deleted !== undefined) {
    query = query.eq("deleted", deleted);
  }

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  query = query.order("created_at", { ascending: false });

  if (!getAll) {
    query = query.range(offset, offset + maxLimit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error(
      "Error fetching admin users unified: %o",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }

  return { data: (data || []) as AdminUsersUnifiedRow[], count };
}
