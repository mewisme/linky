import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:user-blocks");

export interface BlockRecord {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", userId);

  if (error) {
    logger.error(error as Error, "Error fetching blocked users");
    throw error;
  }

  return (data || []).map((row) => row.blocked_user_id);
}

export async function isBlocked(blockerId: string, targetId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id")
    .or(`and(blocker_user_id.eq.${blockerId},blocked_user_id.eq.${targetId}),and(blocker_user_id.eq.${targetId},blocked_user_id.eq.${blockerId})`)
    .maybeSingle();

  if (error) {
    logger.error(error as Error, "Error checking if blocked");
    throw error;
  }

  return data !== null;
}

export async function createBlock(blockerId: string, blockedId: string): Promise<BlockRecord> {
  const { data, error } = await supabase
    .from("user_blocks")
    .insert({
      blocker_user_id: blockerId,
      blocked_user_id: blockedId,
    })
    .select()
    .single();

  if (error) {
    logger.error(error as Error, "Error creating block");
    throw error;
  }

  return data;
}

export async function deleteBlock(blockerId: string, blockedId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", blockerId)
    .eq("blocked_user_id", blockedId);

  if (error) {
    logger.error(error as Error, "Error deleting block");
    throw error;
  }

  return true;
}

export interface BlockedUserRow {
  id: string;
  blocked_user_id: string;
  created_at: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getBlockedUsersWithDetails(userId: string): Promise<BlockedUserRow[]> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id, blocked_user_id, created_at, users!user_blocks_blocked_fkey(first_name, last_name, avatar_url)")
    .eq("blocker_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error(error as Error, "Error fetching blocked users with details");
    throw error;
  }

  return (data || []) as unknown as BlockedUserRow[];
}

export async function checkBlockExists(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_user_id", blockerId)
    .eq("blocked_user_id", blockedId)
    .maybeSingle();

  if (error) {
    logger.error(error as Error, "Error checking block exists");
    throw error;
  }

  return data !== null;
}
