import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

import { config } from "@/config/index.js";
import { CloudflareRealtimeError, isCloudflareRealtimeConfigured } from "@/infra/cloudflare-realtime/index.js";
import { getVideoChatContext } from "@/domains/video-chat/socket/video-chat.socket.js";
import {
  authorizeParticipant,
  cleanupParticipant,
  ensureParticipantSession,
  getParticipantSnapshot,
  publishLocalTracks,
  renegotiateSession,
  subscribePeerTracks,
} from "@/domains/video-chat/service/realtime-sfu.service.js";
import { createRateLimitMiddleware } from "@/middleware/rate-limit.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { toUserMessage } from "@/types/user-message.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:video-chat:realtime:route");

const realtimeRateLimit = createRateLimitMiddleware({
  windowMs: 10_000,
  maxRequests: 30,
  failClosed: false,
});

interface BaseBody {
  roomId?: unknown;
  socketId?: unknown;
}

interface SdpBody {
  sdp?: unknown;
}

interface SessionBody extends SdpBody {
  sessionId?: unknown;
}

interface PublishTrackBody {
  mid?: unknown;
  trackName?: unknown;
  kind?: unknown;
}

function isSdp(value: unknown): value is { sdp: string; type: "offer" | "answer" } {
  if (!value || typeof value !== "object") return false;
  const v = value as { sdp?: unknown; type?: unknown };
  return typeof v.sdp === "string" && (v.type === "offer" || v.type === "answer");
}

function ensureProvider(res: Response): boolean {
  if (config.videoProvider !== "cloudflare_sfu") {
    sendJsonError(
      res,
      404,
      "Not found",
      um("REALTIME_DISABLED", "realtimeDisabled", "Realtime SFU is not enabled"),
    );
    return false;
  }
  if (!isCloudflareRealtimeConfigured()) {
    sendJsonError(
      res,
      503,
      "Service unavailable",
      um("REALTIME_NOT_CONFIGURED", "realtimeNotConfigured", "Realtime SFU not configured"),
    );
    return false;
  }
  return true;
}

function authenticatedClerkId(req: Request, res: Response): string | null {
  const callerClerkId = req.auth?.sub;
  if (!callerClerkId) {
    sendJsonError(
      res,
      401,
      "Unauthorized",
      toUserMessage("API_UNAUTHORIZED", { key: "api.missingAuth" }, "Missing authentication"),
    );
    return null;
  }
  return callerClerkId;
}

function validateBaseBody(req: Request, res: Response): { roomId: string; socketId: string } | null {
  const { roomId, socketId } = (req.body ?? {}) as BaseBody;
  if (typeof roomId !== "string" || typeof socketId !== "string" || !roomId || !socketId) {
    sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid roomId or socketId"),
    );
    return null;
  }
  return { roomId, socketId };
}

function authorize(
  req: Request,
  res: Response,
  roomId: string,
  socketId: string,
): { callerClerkId: string } | null {
  const context = getVideoChatContext();
  if (!context) {
    sendJsonError(
      res,
      503,
      "Service unavailable",
      um("VIDEO_CHAT_UNAVAILABLE", "serviceUnavailable", "Service unavailable"),
    );
    return null;
  }
  const callerClerkId = authenticatedClerkId(req, res);
  if (!callerClerkId) return null;
  const access = authorizeParticipant(context.rooms, roomId, socketId, callerClerkId);
  if (!access.ok) {
    sendJsonError(
      res,
      access.status,
      access.status === 404 ? "Not found" : "Forbidden",
      toUserMessage(
        `REALTIME_${access.reason}`,
        { key: "api.realtime.notAuthorized" },
        access.reason === "ROOM_NOT_FOUND" ? "Room not found" : "Not allowed for this socket/room",
      ),
    );
    return null;
  }
  return { callerClerkId };
}

function handleRealtimeError(res: Response, error: unknown, context: string): void {
  if (error instanceof CloudflareRealtimeError) {
    logger.warn(toLoggableError(error), "Cloudflare Realtime error in %s", context);
    sendJsonError(
      res,
      error.status >= 400 && error.status < 600 ? error.status : 502,
      "Realtime error",
      toUserMessage(
        error.errorCode ?? "REALTIME_ERROR",
        { key: "api.realtime.upstreamError" },
        error.message,
      ),
    );
    return;
  }
  logger.error(toLoggableError(error), "Unexpected error in %s", context);
  sendJsonError(
    res,
    500,
    "Internal server error",
    um("REALTIME_INTERNAL", "internalServerError", "Internal server error"),
  );
}

router.post("/session", realtimeRateLimit, async (req: Request, res: Response) => {
  if (!ensureProvider(res)) return;
  const base = validateBaseBody(req, res);
  if (!base) return;
  const auth = authorize(req, res, base.roomId, base.socketId);
  if (!auth) return;

  try {
    const context = getVideoChatContext();
    if (!context) return;
    const { sessionId } = await ensureParticipantSession(context.rooms, base.roomId, base.socketId);
    const snapshot = getParticipantSnapshot(context.rooms, base.roomId, base.socketId);
    res.json({ sessionId, peer: snapshot });
  } catch (error) {
    handleRealtimeError(res, error, "POST /realtime/session");
  }
});

router.post("/publish", realtimeRateLimit, async (req: Request, res: Response) => {
  if (!ensureProvider(res)) return;
  const base = validateBaseBody(req, res);
  if (!base) return;
  const auth = authorize(req, res, base.roomId, base.socketId);
  if (!auth) return;

  const { sessionId, sdp, tracks } = (req.body ?? {}) as SessionBody & { tracks?: unknown };
  if (typeof sessionId !== "string" || !sessionId || !isSdp(sdp)) {
    return sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId or sdp"),
    );
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    return sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid tracks"),
    );
  }

  const localTracks: { mid: string; trackName: string; kind: "audio" | "video" }[] = [];
  for (const entry of tracks as PublishTrackBody[]) {
    const { mid, trackName, kind } = entry;
    if (typeof mid !== "string" || !mid) continue;
    if (typeof trackName !== "string" || !trackName) continue;
    if (kind !== "audio" && kind !== "video") continue;
    localTracks.push({ mid, trackName, kind });
  }

  if (localTracks.length === 0) {
    return sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid tracks"),
    );
  }

  try {
    const context = getVideoChatContext();
    if (!context) return;
    const response = await publishLocalTracks(
      context.io,
      context.rooms,
      base.roomId,
      base.socketId,
      sessionId,
      sdp,
      localTracks,
    );
    res.json({
      sessionDescription: response.sessionDescription,
      tracks: response.tracks,
      requiresImmediateRenegotiation: response.requiresImmediateRenegotiation ?? false,
    });
  } catch (error) {
    handleRealtimeError(res, error, "POST /realtime/publish");
  }
});

router.post("/subscribe", realtimeRateLimit, async (req: Request, res: Response) => {
  if (!ensureProvider(res)) return;
  const base = validateBaseBody(req, res);
  if (!base) return;
  const auth = authorize(req, res, base.roomId, base.socketId);
  if (!auth) return;

  const { sessionId } = (req.body ?? {}) as SessionBody;
  if (typeof sessionId !== "string" || !sessionId) {
    return sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId"),
    );
  }

  try {
    const context = getVideoChatContext();
    if (!context) return;
    const response = await subscribePeerTracks(context.rooms, base.roomId, base.socketId, sessionId);
    res.json({
      sessionDescription: response.sessionDescription,
      tracks: response.tracks,
      requiresImmediateRenegotiation: response.requiresImmediateRenegotiation ?? false,
    });
  } catch (error) {
    handleRealtimeError(res, error, "POST /realtime/subscribe");
  }
});

router.put("/renegotiate", realtimeRateLimit, async (req: Request, res: Response) => {
  if (!ensureProvider(res)) return;
  const base = validateBaseBody(req, res);
  if (!base) return;
  const auth = authorize(req, res, base.roomId, base.socketId);
  if (!auth) return;

  const { sessionId, sdp } = (req.body ?? {}) as SessionBody;
  if (typeof sessionId !== "string" || !sessionId || !isSdp(sdp)) {
    return sendJsonError(
      res,
      400,
      "Bad Request",
      um("REALTIME_BAD_BODY", "realtimeInvalidBody", "Invalid sessionId or sdp"),
    );
  }

  try {
    const context = getVideoChatContext();
    if (!context) return;
    const result = await renegotiateSession(context.rooms, base.roomId, base.socketId, sessionId, sdp);
    res.json(result);
  } catch (error) {
    handleRealtimeError(res, error, "PUT /realtime/renegotiate");
  }
});

router.post("/cleanup", realtimeRateLimit, async (req: Request, res: Response) => {
  if (!ensureProvider(res)) return;
  const base = validateBaseBody(req, res);
  if (!base) return;

  const context = getVideoChatContext();
  if (!context) {
    sendJsonError(
      res,
      503,
      "Service unavailable",
      um("VIDEO_CHAT_UNAVAILABLE", "serviceUnavailable", "Service unavailable"),
    );
    return;
  }

  const callerClerkId = authenticatedClerkId(req, res);
  if (!callerClerkId) return;

  const access = authorizeParticipant(context.rooms, base.roomId, base.socketId, callerClerkId);
  if (!access.ok) {
    if (access.reason === "ROOM_NOT_FOUND" || access.reason === "SOCKET_NOT_IN_ROOM") {
      res.json({ ok: true });
      return;
    }
    sendJsonError(
      res,
      403,
      "Forbidden",
      toUserMessage(
        `REALTIME_${access.reason}`,
        { key: "api.realtime.notAuthorized" },
        "Not allowed for this socket/room",
      ),
    );
    return;
  }

  try {
    await cleanupParticipant(context.rooms, base.roomId, base.socketId);
    res.json({ ok: true });
  } catch (error) {
    handleRealtimeError(res, error, "POST /realtime/cleanup");
  }
});

export default router;
