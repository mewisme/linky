import type { Namespace } from "socket.io";
import type { Socket } from "socket.io";
import { Logger } from "../../../utils/logger.js";
import { checkIfUserIsAdmin } from "../../../infra/admin-cache/index.js";

const logger = new Logger("SocketAuth");

export async function adminNamespaceAuthMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
  const clerkUserId = (socket.data as { userId?: string } | undefined)?.userId;
  if (!clerkUserId) {
    return next(new Error("Authentication required"));
  }

  try {
    const isAdmin = await checkIfUserIsAdmin(clerkUserId);
    if (!isAdmin) {
      return next(new Error("Admin access required"));
    }
    next();
  } catch (error) {
    logger.error("Admin namespace auth failed:", error instanceof Error ? error.message : "Unknown error");
    next(new Error("Authorization failed"));
  }
}

export function setupAdminNamespace(
  admin: Namespace,
  deps: { socketAuthMiddleware: (socket: Socket, next: (err?: Error) => void) => Promise<void> }
): void {
  admin.use(deps.socketAuthMiddleware);
  admin.use(adminNamespaceAuthMiddleware);
}

