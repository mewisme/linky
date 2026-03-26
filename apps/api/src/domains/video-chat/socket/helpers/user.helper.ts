import type { AuthenticatedSocket } from "@/socket/auth.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

export async function getDbUserId(socket: AuthenticatedSocket): Promise<string | null> {
  if (socket.data.dbUserId) {
    return socket.data.dbUserId;
  }

  const clerkUserId = socket.data.userId;
  if (!clerkUserId) {
    return null;
  }

  const dbUserId = await getUserIdByClerkId(clerkUserId);
  if (dbUserId) {
    socket.data.dbUserId = dbUserId;
  }
  return dbUserId;
}
