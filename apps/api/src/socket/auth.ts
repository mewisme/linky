import { clerk, verifyToken } from '../infra/clerk/client.js';

import type { AuthenticatedSocket } from "../types/socket/socket-context.types.js";
import type { Socket } from "socket.io";
import { checkIfUserIsAdmin } from "../infra/admin-cache/index.js";
import { config } from "../config/index.js";
import { createLogger } from "@repo/logger";

export type { AuthenticatedSocket } from "../types/socket/socket-context.types.js";

const logger = createLogger("API:Socket:Auth");

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined;

    const tokenFromQuery = socket.handshake.query?.token as string | undefined;

    const token = tokenFromAuth || tokenFromQuery;

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
      logger.warn("Failed to fetch user profile from Clerk: %s, Error: %o", payload.sub, err instanceof Error ? err : new Error(String(err)));
    }

    (socket as AuthenticatedSocket).data = {
      userId: payload.sub,
      userName,
      userImageUrl,
      auth: payload,
    };

    logger.info("Socket authenticated: %s, User: %s", socket.id, userName);

    next();
  } catch (error: unknown) {
    logger.error("Socket authentication failed: %o", error instanceof Error ? error : new Error(String(error)));
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
    logger.error("Admin namespace auth failed: %o", error instanceof Error ? error : new Error(String(error)));
    next(new Error("Authorization failed"));
  }
}

