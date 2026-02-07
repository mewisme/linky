import type { AuthenticatedSocket } from "@/socket/auth.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

export async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }
  return await getUserIdByClerkId(clerkUserId);
}
