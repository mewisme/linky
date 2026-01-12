import { type Server as SocketIOServer } from "socket.io";
import { MatchmakingService } from "../../services/matchmaking.js";
import { RoomService } from "../../services/rooms.js";
import { logger } from "../../utils/logger.js";

export function setupMatchmakingInterval(
  io: SocketIOServer,
  matchmaking: MatchmakingService,
  rooms: RoomService
): void {
  setInterval(() => {
    const queueSize = matchmaking.getQueueSize();
    if (queueSize >= 2) {
      logger.load(`Matching users (queue: ${queueSize})...`);
      const matched = matchmaking.tryMatch();
      if (matched && matched.length === 2) {
        const [user1, user2] = matched;

        if (!user1 || !user2) {
          logger.error("Match failed: Invalid user data");
          return;
        }

        const roomId = rooms.createRoom(user1.socketId, user2.socketId);
        const isUser1Offerer = user1.socketId < user2.socketId;

        user1.socket.emit("matched", {
          roomId,
          peerId: user2.socketId,
          isOfferer: isUser1Offerer,
        });

        user2.socket.emit("matched", {
          roomId,
          peerId: user1.socketId,
          isOfferer: !isUser1Offerer,
        });

        logger.done("Users matched:", user1.socketId, "and", user2.socketId, `(Active rooms: ${rooms.getRoomCount()}, Remaining queue: ${matchmaking.getQueueSize()})`);
      }
    }
  }, 1000);
}
