import { createClerkClient, verifyToken } from "@clerk/backend";

import type { Socket } from "socket.io";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const clerk = createClerkClient({ secretKey: config.clerkSecretKey });

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    userName?: string;
    userImageUrl?: string;
    auth?: Awaited<ReturnType<typeof verifyToken>>;
  };
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined;

    const tokenFromQuery = socket.handshake.query?.token as string | undefined;

    const token = tokenFromAuth || tokenFromQuery;

    if (!token) {
      logger.warn("Socket connection rejected: No token provided", {
        socketId: socket.id,
      });
      return next(new Error("Authentication required"));
    }

    const payload = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
    });

    let userName = "Anonymous";
    let userImageUrl: string | undefined;

    try {
      const user = await clerk.users.getUser(payload.sub);
      userName = user.firstName || user.username || "Anonymous";
      userImageUrl = user.imageUrl;
    } catch (err) {
      logger.warn("Failed to fetch user profile from Clerk", {
        userId: payload.sub,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    (socket as AuthenticatedSocket).data = {
      userId: payload.sub,
      userName,
      userImageUrl,
      auth: payload,
    };

    logger.info("Socket authenticated:", userName);

    next();
  } catch (error) {
    logger.error("Socket authentication failed:", error instanceof Error ? error.message : "Unknown error");
    next(new Error("Authentication failed"));
  }
}

