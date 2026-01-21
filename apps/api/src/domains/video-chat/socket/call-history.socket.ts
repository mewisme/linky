import type { AuthenticatedSocket } from "../../../socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRoom } from "../types/room.types.js";
import { createLogger } from "@repo/logger/api";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import { recordCallHistoryInDatabase } from "../service/call-history.service.js";

const logger = createLogger("API:VideoChat:CallHistory:Socket");

export async function recordCallHistory(
  io: Namespace,
  room: VideoChatRoom,
  socket1: AuthenticatedSocket,
  socket2: AuthenticatedSocket | undefined,
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
      const otherSocket = io.sockets.get(otherSocketId) as AuthenticatedSocket | undefined;

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

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - room.startedAt.getTime()) / 1000);

    await recordCallHistoryInDatabase({
      callerId,
      calleeId,
      startedAt: room.startedAt,
      endedAt,
      durationSeconds: durationSeconds > 0 ? durationSeconds : 0,
    });

    logger.info("Call history recorded: %s %s %d", callerId, calleeId, durationSeconds);
  } catch (error) {
    logger.error("Error recording call history: %o", error instanceof Error ? error : new Error(String(error)));
  }
}

