import { createSocketServer } from "../socket/index.js";
import { logger } from "../utils/logger.js";
import { supabase } from "./supabase/client.js";

// Cache for admin socket IDs - updated on connect/disconnect
const adminSocketIds = new Set<string>();

// Cache for admin user IDs - refreshed periodically
const adminUserIds = new Set<string>();
let lastAdminCacheUpdate = 0;
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user is an admin by querying Supabase
 * Uses cache to avoid frequent database queries
 * @param clerkUserId - The Clerk user ID to check
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export async function checkIfUserIsAdmin(clerkUserId: string): Promise<boolean> {
  const now = Date.now();

  // Refresh admin cache if expired
  if (now - lastAdminCacheUpdate > ADMIN_CACHE_TTL) {
    await refreshAdminCache();
  }

  // Check cache first
  if (adminUserIds.has(clerkUserId)) {
    return true;
  }

  // If not in cache, query Supabase and update cache
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

/**
 * Refresh the admin user IDs cache from Supabase
 */
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

    // Update cache
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

/**
 * Initialize admin cache
 * Call this on server startup to pre-populate the cache
 */
export async function initializeAdminCache(): Promise<void> {
  await refreshAdminCache();
}

/**
 * Manually refresh the admin cache
 * Useful when admin roles are updated
 */
export async function refreshAdminCacheManually(): Promise<void> {
  await refreshAdminCache();
}

/**
 * Get all admin socket IDs
 * @returns Set of admin socket IDs
 */
export function getAdminSocketIds(): Set<string> {
  return adminSocketIds;
}

/**
 * Remove a socket ID from admin cache (for cleanup)
 * @param socketId - The socket ID to remove
 */
export function removeAdminSocket(socketId: string): void {
  adminSocketIds.delete(socketId);
}

/**
 * Initialize admin cache tracking for Socket.IO connections
 * Sets up socket connection/disconnection handlers to maintain admin cache
 * @param io - The Socket.IO server instance
 */
export function setupAdminCacheTracking(io: ReturnType<typeof createSocketServer>): void {
  // Setup socket connection/disconnection handlers to maintain admin cache
  io.on("connection", async (socket) => {
    const userId = (socket.data as { userId?: string })?.userId;
    if (!userId) return;

    // Check if user is admin and add to cache
    const isAdmin = await checkIfUserIsAdmin(userId);
    if (isAdmin) {
      adminSocketIds.add(socket.id);
      logger.info(`Admin socket connected: ${socket.id} (user: ${userId})`);
    }

    // Remove from cache on disconnect
    socket.on("disconnect", () => {
      adminSocketIds.delete(socket.id);
      logger.info(`Admin socket disconnected: ${socket.id}`);
    });
  });
}

