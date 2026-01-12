import { type Server as SocketIOServer } from "socket.io";
import { logger } from "../../utils/logger.js";
import { type AuthenticatedSocket } from "../auth.js";
import {
  getUserIdByClerkId,
  getUserCountry,
  createCallHistory,
} from "../../lib/supabase/queries/call-history.js";

export interface Room {
  user1: string;
  user2: string;
  startedAt: Date;
}

export async function recordCallHistory(
  io: SocketIOServer,
  room: Room,
  socket1: AuthenticatedSocket,
  socket2: AuthenticatedSocket | undefined
): Promise<void> {
  try {
    const clerkUserId1 = socket1.data.userId;
    if (!clerkUserId1) {
      logger.warn("Cannot record call history: User 1 has no Clerk user ID");
      return;
    }

    const dbUserId1 = await getUserIdByClerkId(clerkUserId1);
    if (!dbUserId1) {
      logger.warn("Cannot record call history: User 1 not found in database");
      return;
    }

    let dbUserId2: string | null = null;
    if (socket2?.data.userId) {
      dbUserId2 = await getUserIdByClerkId(socket2.data.userId);
    }

    if (!dbUserId2) {
      const isSocket1User1 = room.user1 === socket1.id;
      const otherSocketId = isSocket1User1 ? room.user2 : room.user1;
      const otherSocket = io.sockets.sockets.get(otherSocketId) as AuthenticatedSocket | undefined;

      if (otherSocket?.data.userId) {
        dbUserId2 = await getUserIdByClerkId(otherSocket.data.userId);
      }
    }

    if (!dbUserId2) {
      logger.warn("Cannot record call history: User 2 not found in database");
      return;
    }

    const callerId = dbUserId1;
    const calleeId = dbUserId2;

    const callerCountry = await getUserCountry(callerId);
    const calleeCountry = await getUserCountry(calleeId);

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - room.startedAt.getTime()) / 1000);

    await createCallHistory({
      callerId,
      calleeId,
      callerCountry,
      calleeCountry,
      startedAt: room.startedAt,
      endedAt,
      durationSeconds: durationSeconds > 0 ? durationSeconds : 0,
    });

    logger.info("Call history recorded:", {
      callerId,
      calleeId,
      duration: durationSeconds,
    });
  } catch (error) {
    logger.error("Error recording call history:", error instanceof Error ? error.message : "Unknown error");
  }
}
