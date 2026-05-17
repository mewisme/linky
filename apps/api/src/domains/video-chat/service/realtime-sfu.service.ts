import type { Namespace } from "socket.io";

import {
  CloudflareRealtimeError,
  addTracks,
  closeTracks,
  createSession,
  getSession,
  isCloudflareRealtimeConfigured,
  renegotiate,
  type CloudflareSdpDescription,
  type CloudflareTrackRequest,
  type CloudflareTracksResponse,
} from "@/infra/cloudflare-realtime/index.js";
import type {
  VideoChatRoomRealtimeParticipant,
  VideoChatRoomRealtimeTrack,
  VideoChatRoomRecord,
} from "@/domains/video-chat/types/room.types.js";
import type { VideoChatRooms } from "@/domains/video-chat/socket/types.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";

const logger = createLogger("api:video-chat:realtime-sfu:service");

export type RealtimeAccess =
  | { ok: true; room: VideoChatRoomRecord; participant: VideoChatRoomRealtimeParticipant | null; isUser1: boolean }
  | { ok: false; status: 403 | 404; reason: string };

export interface PeerTracksEventPayload {
  peerSessionId: string;
  tracks: { trackName: string; kind: "audio" | "video"; source: VideoChatRoomRealtimeTrack["source"] }[];
}

function ensureRealtime(room: VideoChatRoomRecord): NonNullable<VideoChatRoomRecord["realtime"]> {
  if (!room.realtime) {
    room.realtime = { participants: {} };
  }
  return room.realtime;
}

function isRoomMember(room: VideoChatRoomRecord, socketId: string): boolean {
  return room.user1 === socketId || room.user2 === socketId;
}

function ownsSocketInRoom(room: VideoChatRoomRecord, socketId: string, callerClerkId: string): boolean {
  if (room.user1 === socketId) return room.user1ClerkId === callerClerkId;
  if (room.user2 === socketId) return room.user2ClerkId === callerClerkId;
  return false;
}

export function authorizeParticipant(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
  callerClerkId: string,
): RealtimeAccess {
  const room = rooms.getRoom(roomId);
  if (!room) {
    return { ok: false, status: 404, reason: "ROOM_NOT_FOUND" };
  }
  if (!isRoomMember(room, socketId)) {
    return { ok: false, status: 403, reason: "SOCKET_NOT_IN_ROOM" };
  }
  if (!ownsSocketInRoom(room, socketId, callerClerkId)) {
    return { ok: false, status: 403, reason: "SOCKET_OWNERSHIP_MISMATCH" };
  }
  const isUser1 = room.user1 === socketId;
  const participant = room.realtime?.participants[socketId] ?? null;
  return { ok: true, room, participant, isUser1 };
}

function inferTrackSource(kind: "audio" | "video"): VideoChatRoomRealtimeTrack["source"] {
  return kind === "audio" ? "microphone" : "camera";
}

function dedupeTracks(
  existing: VideoChatRoomRealtimeTrack[],
  incoming: VideoChatRoomRealtimeTrack[],
): VideoChatRoomRealtimeTrack[] {
  const map = new Map<string, VideoChatRoomRealtimeTrack>();
  for (const t of existing) map.set(t.trackName, t);
  for (const t of incoming) map.set(t.trackName, { ...map.get(t.trackName), ...t });
  return Array.from(map.values());
}

function emitPeerTracks(
  io: Namespace,
  room: VideoChatRoomRecord,
  publisherSocketId: string,
): void {
  if (!room.realtime) return;
  const publisher = room.realtime.participants[publisherSocketId];
  if (!publisher) return;
  const peerSocketId = publisherSocketId === room.user1 ? room.user2 : room.user1;
  const peerSocket = io.sockets.get(peerSocketId);
  if (!peerSocket || !peerSocket.connected) {
    logger.debug("Peer offline; skipping realtime:peer-tracks emit room=%s peer=%s", room.id, peerSocketId);
    return;
  }
  const payload: PeerTracksEventPayload = {
    peerSessionId: publisher.sessionId,
    tracks: publisher.publishedTracks.map((t) => ({
      trackName: t.trackName,
      kind: t.kind,
      source: t.source,
    })),
  };
  io.to(peerSocketId).emit("realtime:peer-tracks", payload);
}

export async function ensureParticipantSession(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
): Promise<{ sessionId: string; participant: VideoChatRoomRealtimeParticipant }> {
  if (!isCloudflareRealtimeConfigured()) {
    throw new CloudflareRealtimeError("Realtime not configured", 500, "REALTIME_NOT_CONFIGURED");
  }
  const room = rooms.getRoom(roomId);
  if (!room) {
    throw new CloudflareRealtimeError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  const realtime = ensureRealtime(room);
  const existing = realtime.participants[socketId];
  if (existing) {
    try {
      await getSession(existing.sessionId);
      return { sessionId: existing.sessionId, participant: existing };
    } catch (error) {
      if (
        error instanceof CloudflareRealtimeError &&
        (error.status === 410 || error.status === 404)
      ) {
        logger.info(
          "Replacing stale Cloudflare session room=%s socket=%s old=%s",
          room.id,
          socketId,
          existing.sessionId,
        );
        await cleanupParticipantSession(existing);
        delete realtime.participants[socketId];
      } else {
        throw error;
      }
    }
  }
  const created = await createSession();
  if (!created.sessionId) {
    throw new CloudflareRealtimeError(
      `Cloudflare did not return a sessionId (${created.errorCode ?? "unknown"})`,
      502,
      created.errorCode ?? "REALTIME_NO_SESSION",
    );
  }
  const participant: VideoChatRoomRealtimeParticipant = {
    sessionId: created.sessionId,
    socketId,
    publishedTracks: [],
    subscribedMids: [],
    createdAt: Date.now(),
  };
  realtime.participants[socketId] = participant;
  logger.info("Created Cloudflare session room=%s socket=%s session=%s", room.id, socketId, created.sessionId);
  return { sessionId: created.sessionId, participant };
}

export async function provisionRoomRealtimeSessions(
  rooms: VideoChatRooms,
  roomId: string,
  user1SocketId: string,
  user2SocketId: string,
): Promise<{ user1SessionId: string; user2SessionId: string }> {
  const [user1, user2] = await Promise.all([
    ensureParticipantSession(rooms, roomId, user1SocketId),
    ensureParticipantSession(rooms, roomId, user2SocketId),
  ]);
  return { user1SessionId: user1.sessionId, user2SessionId: user2.sessionId };
}

export interface PublishLocalTrackMeta {
  mid: string;
  trackName: string;
  kind: "audio" | "video";
}

export async function publishLocalTracks(
  io: Namespace,
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
  sessionId: string,
  offer: CloudflareSdpDescription,
  localTracks: PublishLocalTrackMeta[],
): Promise<CloudflareTracksResponse> {
  const room = rooms.getRoom(roomId);
  if (!room) {
    throw new CloudflareRealtimeError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  const realtime = ensureRealtime(room);
  const participant = realtime.participants[socketId];
  if (!participant || participant.sessionId !== sessionId) {
    throw new CloudflareRealtimeError("Session does not belong to participant", 403, "REALTIME_SESSION_MISMATCH");
  }

  if (localTracks.length === 0) {
    throw new CloudflareRealtimeError("No local tracks to publish", 400, "REALTIME_NO_LOCAL_TRACKS");
  }

  const kindByTrackName = new Map(localTracks.map((t) => [t.trackName, t.kind]));
  const response = await addTracks(sessionId, {
    sessionDescription: offer,
    tracks: localTracks.map((t) => ({
      location: "local" as const,
      mid: t.mid,
      trackName: t.trackName,
    })),
  });

  const newTracks: VideoChatRoomRealtimeTrack[] = (response.tracks ?? [])
    .filter((t) => Boolean(t.trackName))
    .map((t) => {
      const trackName = t.trackName as string;
      const kind =
        kindByTrackName.get(trackName) ??
        ((t.kind === "audio" || t.kind === "video" ? t.kind : undefined) ?? "video");
      return {
        trackName,
        mid: t.mid,
        kind,
        source: inferTrackSource(kind),
      };
    });

  participant.publishedTracks = dedupeTracks(participant.publishedTracks, newTracks);
  emitPeerTracks(io, room, socketId);
  return response;
}

export async function subscribePeerTracks(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
  sessionId: string,
): Promise<CloudflareTracksResponse> {
  const room = rooms.getRoom(roomId);
  if (!room) {
    throw new CloudflareRealtimeError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  const realtime = ensureRealtime(room);
  const participant = realtime.participants[socketId];
  if (!participant || participant.sessionId !== sessionId) {
    throw new CloudflareRealtimeError("Session does not belong to participant", 403, "REALTIME_SESSION_MISMATCH");
  }
  const peerSocketId = socketId === room.user1 ? room.user2 : room.user1;
  const peer = realtime.participants[peerSocketId];
  if (!peer) {
    throw new CloudflareRealtimeError("Peer has not published yet", 409, "REALTIME_PEER_NOT_READY");
  }
  if (peer.publishedTracks.length === 0) {
    throw new CloudflareRealtimeError("Peer has no tracks", 409, "REALTIME_PEER_NO_TRACKS");
  }

  const tracks: CloudflareTrackRequest[] = peer.publishedTracks.map((t) => {
    const base: CloudflareTrackRequest = {
      location: "remote",
      sessionId: peer.sessionId,
      trackName: t.trackName,
    };
    if (t.kind === "video") {
      base.simulcast = {
        preferredRid: "h",
        priorityOrdering: "asciibetical",
        ridNotAvailable: "asciibetical",
      };
    }
    return base;
  });

  const response = await addTracks(sessionId, { tracks });
  const newMids = (response.tracks ?? [])
    .map((t) => t.mid)
    .filter((mid): mid is string => typeof mid === "string");
  const merged = new Set([...participant.subscribedMids, ...newMids]);
  participant.subscribedMids = Array.from(merged);
  return response;
}

export async function renegotiateSession(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
  sessionId: string,
  description: CloudflareSdpDescription,
): Promise<{ ok: boolean; errorCode?: string; errorDescription?: string }> {
  const room = rooms.getRoom(roomId);
  if (!room) {
    throw new CloudflareRealtimeError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  const participant = room.realtime?.participants[socketId];
  if (!participant || participant.sessionId !== sessionId) {
    throw new CloudflareRealtimeError("Session does not belong to participant", 403, "REALTIME_SESSION_MISMATCH");
  }
  try {
    const result = await renegotiate(sessionId, { sessionDescription: description });
    return { ok: !result.errorCode, errorCode: result.errorCode, errorDescription: result.errorDescription };
  } catch (error) {
    if (
      error instanceof CloudflareRealtimeError &&
      (error.status === 410 || error.status === 404)
    ) {
      logger.debug(
        "Cloudflare renegotiate skipped for closed session=%s status=%d",
        sessionId,
        error.status,
      );
      return { ok: true };
    }
    throw error;
  }
}

export async function cleanupParticipantSession(
  participant: VideoChatRoomRealtimeParticipant,
): Promise<void> {
  const closeBody = participant.subscribedMids
    .map((mid) => ({ mid }))
    .concat(
      participant.publishedTracks
        .map((t) => (t.mid ? { mid: t.mid } : null))
        .filter((entry): entry is { mid: string } => entry !== null),
    );
  if (closeBody.length === 0) return;
  try {
    await closeTracks(participant.sessionId, { tracks: closeBody, force: true });
    logger.info(
      "Closed Cloudflare tracks session=%s tracks=%d",
      participant.sessionId,
      closeBody.length,
    );
  } catch (error) {
    if (
      error instanceof CloudflareRealtimeError &&
      (error.status === 410 || error.status === 404)
    ) {
      logger.debug(
        "Cloudflare session already closed session=%s status=%d",
        participant.sessionId,
        error.status,
      );
      return;
    }
    logger.warn(toLoggableError(error), "Failed to close Cloudflare tracks for session %s", participant.sessionId);
  }
}

export async function cleanupParticipant(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
): Promise<void> {
  const room = rooms.getRoom(roomId);
  if (!room || !room.realtime) return;
  const participant = room.realtime.participants[socketId];
  if (!participant) return;

  delete room.realtime.participants[socketId];
  if (Object.keys(room.realtime.participants).length === 0) {
    room.realtime = undefined;
  }

  await cleanupParticipantSession(participant);
}

export async function cleanupRoomBestEffort(
  room: VideoChatRoomRecord,
): Promise<void> {
  if (!room.realtime) return;
  const participants = Object.values(room.realtime.participants);
  room.realtime = undefined;
  await Promise.all(participants.map((p) => cleanupParticipantSession(p)));
}

export async function cleanupRoom(rooms: VideoChatRooms, roomId: string): Promise<void> {
  const room = rooms.getRoom(roomId);
  if (!room) return;
  await cleanupRoomBestEffort(room);
}

export function getParticipantSnapshot(
  rooms: VideoChatRooms,
  roomId: string,
  socketId: string,
): { peerSessionId: string | null; tracks: PeerTracksEventPayload["tracks"] } {
  const room = rooms.getRoom(roomId);
  if (!room || !room.realtime) {
    return { peerSessionId: null, tracks: [] };
  }
  const peerSocketId = socketId === room.user1 ? room.user2 : room.user1;
  const peer = room.realtime.participants[peerSocketId];
  if (!peer) return { peerSessionId: null, tracks: [] };
  return {
    peerSessionId: peer.sessionId,
    tracks: peer.publishedTracks.map((t) => ({
      trackName: t.trackName,
      kind: t.kind,
      source: t.source,
    })),
  };
}
