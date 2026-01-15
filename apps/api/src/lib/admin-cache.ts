import { Logger } from "../utils/logger.js";
import { createSocketServer } from "../socket/index.js";
import { supabase } from "./supabase/client.js";

const logger = new Logger("AdminCache");

const adminSocketIds = new Set<string>();
const adminUserIds = new Set<string>();
let lastAdminCacheUpdate = 0;
const ADMIN_CACHE_TTL = 5 * 60 * 1000;

export async function checkIfUserIsAdmin(clerkUserId: string): Promise<boolean> {
  const now = Date.now();

  if (now - lastAdminCacheUpdate > ADMIN_CACHE_TTL) {
    await refreshAdminCache();
  }

  if (adminUserIds.has(clerkUserId)) {
    return true;
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error || !user) {
      return false;
    }

    const isAdmin = user.role === "admin";
    if (isAdmin) {
      adminUserIds.add(clerkUserId);
    }

    return isAdmin;
  } catch (error) {
    logger.error("Error checking admin status:", error);
    return false;
  }
}

async function refreshAdminCache(): Promise<void> {
  try {
    const { data: adminUsers, error } = await supabase
      .from("users")
      .select("clerk_user_id")
      .eq("role", "admin");

    if (error) {
      logger.error("Error refreshing admin cache:", error);
      return;
    }

    adminUserIds.clear();
    if (adminUsers) {
      adminUsers.forEach((user) => {
        adminUserIds.add(user.clerk_user_id);
      });
    }

    lastAdminCacheUpdate = Date.now();
    logger.info(`Admin cache refreshed: ${adminUserIds.size} admin users`);
  } catch (error) {
    logger.error("Error refreshing admin cache:", error);
  }
}

export async function initializeAdminCache(): Promise<void> {
  await refreshAdminCache();
}

export async function refreshAdminCacheManually(): Promise<void> {
  await refreshAdminCache();
}

export function getAdminSocketIds(): Set<string> {
  return adminSocketIds;
}

export function removeAdminSocket(socketId: string): void {
  adminSocketIds.delete(socketId);
}

export function setupAdminCacheTracking(io: ReturnType<typeof createSocketServer>): void {
  io.on("connection", async (socket) => {
    const userId = (socket.data as { userId?: string })?.userId;
    if (!userId) return;

    const isAdmin = await checkIfUserIsAdmin(userId);
    if (isAdmin) {
      adminSocketIds.add(socket.id);
      logger.info(`Admin socket connected: ${socket.id} (user: ${userId})`);
    }

    socket.on("disconnect", () => {
      adminSocketIds.delete(socket.id);
      logger.info(`Admin socket disconnected: ${socket.id}`);
    });
  });
}

