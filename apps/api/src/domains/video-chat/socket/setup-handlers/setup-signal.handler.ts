import type { SignalPayload } from "@/domains/video-chat/types/socket-event.types.js";
import type { AuthenticatedSocket } from "@/socket/auth.js";
import type { Namespace } from "socket.io";
import type { VideoChatRooms } from "../types.js";
import { logger } from "../helpers/logger.helper.js";

const VALID_SIGNAL_TYPES = new Set(["offer", "answer", "ice-candidate"]);
const MAX_SDP_LENGTH = 65_536;
const MAX_CANDIDATE_JSON_LENGTH = 4_096;

function isValidSignalPayload(data: unknown): data is SignalPayload {
  if (!data || typeof data !== "object") return false;

  const payload = data as Record<string, unknown>;
  if (typeof payload.type !== "string" || !VALID_SIGNAL_TYPES.has(payload.type)) return false;

  if (payload.sdp !== undefined) {
    if (typeof payload.sdp !== "object" || payload.sdp === null) return false;
    const sdp = payload.sdp as Record<string, unknown>;
    if (typeof sdp.sdp === "string" && sdp.sdp.length > MAX_SDP_LENGTH) return false;
  }

  if (payload.candidate !== undefined && payload.candidate !== null) {
    if (typeof payload.candidate !== "object") return false;
    const candidateStr = JSON.stringify(payload.candidate);
    if (candidateStr.length > MAX_CANDIDATE_JSON_LENGTH) return false;
  }

  return true;
}

export function setupSignalHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  rooms: VideoChatRooms,
): void {
  socket.on("signal", (data: SignalPayload) => {
    if (!isValidSignalPayload(data)) {
      logger.warn("Invalid signal payload from socket: %s", socket.id);
      socket.emit("video-chat:error", {
        message: "Invalid signal payload.",
      });
      return;
    }

    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("video-chat:error", {
        message: "Not in a room. Cannot send signal.",
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) {
      return;
    }

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket || !peerSocket.connected) {
      socket.emit("video-chat:error", {
        message: "Peer disconnected. Cannot send signal.",
      });
      return;
    }

    io.to(peerId).emit("signal", data);
  });
}
