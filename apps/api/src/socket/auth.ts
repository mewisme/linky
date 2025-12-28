import type { Socket } from "socket.io";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { verifyToken } from "@clerk/backend";

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    auth?: Awaited<ReturnType<typeof verifyToken>>;
  };
}

/**
 * Clerk authentication middleware for Socket.IO
 * Verifies the Clerk token from handshake auth or query params
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Try to get token from handshake auth first (recommended)
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined;

    // Fallback to query params (for compatibility)
    const tokenFromQuery = socket.handshake.query?.token as string | undefined;

    const token = tokenFromAuth || tokenFromQuery;

    if (!token) {
      logger.warn("Socket connection rejected: No token provided", {
        socketId: socket.id,
      });
      return next(new Error("Authentication required"));
    }

    // Verify token with Clerk
    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });

    // Attach auth data to socket
    (socket as AuthenticatedSocket).data = {
      userId: payload.sub,
      auth: payload,
    };

    logger.info("Socket authenticated", {
      socketId: socket.id,
      userId: payload.sub,
    });

    next();
  } catch (error) {
    logger.error("Socket authentication failed", {
      socketId: socket.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next(new Error("Authentication failed"));
  }
}

