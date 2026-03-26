import { clerk, verifyToken } from "@/infra/clerk/client.js";

import type { AuthenticatedSocket } from "@/types/socket/socket-context.types.js";
import type { Socket } from "socket.io";
import { checkIfUserIsAdmin } from "@/infra/admin-cache/index.js";
import { createLogger } from "@/utils/logger.js";

export type { AuthenticatedSocket } from "@/types/socket/socket-context.types.js";

const logger = createLogger("socket:auth");

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      logger.warn("Socket connection rejected: No token provided: %s", socket.id);
      return next(new Error("Authentication required"));
    }

    const payload = await verifyToken(token);

    let userName = "Anonymous";
    let userImageUrl: string | undefined;

    try {
      const user = await clerk.users.getUser(payload.sub);
      userName = user.firstName || user.username || "Anonymous";
      userImageUrl = user.imageUrl;
    } catch (err: unknown) {
      logger.warn(err instanceof Error ? err : new Error(String(err)), "Failed to fetch user profile from Clerk: %s", payload.sub);
    }

    (socket as AuthenticatedSocket).data = {
      userId: payload.sub,
      userName,
      userImageUrl,
      auth: payload,
    };

    next();
  } catch (error: unknown) {
    logger.error(error as Error, "Socket authentication failed");
    next(new Error("Authentication failed"));
  }
}

export async function adminNamespaceAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
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
  } catch (error: unknown) {
    logger.error(error as Error, "Admin namespace auth failed");
    next(new Error("Authorization failed"));
  }
}

