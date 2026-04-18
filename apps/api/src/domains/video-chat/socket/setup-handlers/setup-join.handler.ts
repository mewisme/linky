import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { VideoChatMatchmaking, VideoChatRooms } from "../types.js";
import { logger } from "../helpers/logger.helper.js";
import { getDbUserId } from "../helpers/user.helper.js";
import { toUserMessage, userFacingPayload } from "@/types/user-message.js";

export function setupJoinHandler(
  socket: AuthenticatedSocket,
  matchmaking: VideoChatMatchmaking,
  rooms: VideoChatRooms,
): void {
  socket.on("join", async () => {
    if (rooms.isInRoom(socket.id)) {
      socket.emit(
        "video-chat:error",
        userFacingPayload(
          toUserMessage(
            "JOIN_ALREADY_IN_ROOM",
            { key: "call.join.alreadyInRoom" },
            "Already in a room. Please disconnect first.",
          ),
        ),
      );
      return;
    }

    const dbUserId = await getDbUserId(socket);
    if (dbUserId) {
      const wasAlreadyInQueue = await matchmaking.isInQueue(dbUserId);
      const wasQueueOwner = await matchmaking.isQueueOwner(dbUserId, socket.id);

      if (wasAlreadyInQueue && !wasQueueOwner) {
        logger.info(
          "User reconnected with new socketId: userId=%s oldSocket=(cached) newSocket=%s",
          dbUserId,
          socket.id,
        );
      }
    }

    const added = await matchmaking.enqueue(socket);
    if (!added) {
      socket.emit(
        "video-chat:error",
        userFacingPayload(
          toUserMessage("JOIN_ALREADY_IN_QUEUE", { key: "call.join.alreadyInQueue" }, "Already in queue."),
        ),
      );
      return;
    }

    const queueSize = await matchmaking.getQueueSize();
    socket.emit("joined-queue", {
      ...userFacingPayload(
        toUserMessage("JOIN_WAITING", { key: "call.join.waitingForMatch" }, "Waiting for a match..."),
      ),
      queueSize,
    });
  });
}
