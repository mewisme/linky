import { getCallHistoryById, getUserIdByClerkId } from "../lib/supabase/queries/call-history.js";

import type { Json } from "../types/database.types.js";
import { Logger } from "../utils/logger.js";
import type { Namespace } from "socket.io";
import { getVideoChatContext } from "../socket/video-chat/context.js";

const logger = new Logger("ReportContextService");

export interface CollectReportContextParams {
  reporterUserId: string;
  reportedUserId: string;
  callId?: string;
  roomId?: string;
  behaviorFlags?: {
    call_metadata?: {
      reporter_muted?: boolean;
      reported_muted?: boolean;
      reporter_video_off?: boolean;
      reported_video_off?: boolean;
      call_ended_by?: "reporter" | "reported" | "system";
      end_type?: "end-call" | "skip" | "disconnect";
    };
    reporter_flags?: string[];
  };
}

export interface ReportContextData {
  call_id: string | null;
  room_id: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  duration_seconds: number | null;
  reporter_role: string | null;
  reported_role: string | null;
  ended_by: string | null;
  reported_at_offset_seconds: number | null;
  chat_snapshot: Json | null;
  behavior_flags: Json | null;
}

export async function collectReportContext(
  params: CollectReportContextParams
): Promise<ReportContextData> {
  const { reporterUserId, reportedUserId, callId, roomId, behaviorFlags } = params;

  const context: ReportContextData = {
    call_id: callId || null,
    room_id: roomId || null,
    call_started_at: null,
    call_ended_at: null,
    duration_seconds: null,
    reporter_role: null,
    reported_role: null,
    ended_by: null,
    reported_at_offset_seconds: null,
    chat_snapshot: null,
    behavior_flags: behaviorFlags ? (behaviorFlags as Json) : null,
  };

  if (callId) {
    try {
      const callHistory = await getCallHistoryById(callId);
      if (callHistory) {
        context.call_started_at = callHistory.started_at;
        context.call_ended_at = callHistory.ended_at || null;
        context.duration_seconds = callHistory.duration_seconds || null;

        if (callHistory.caller_id === reporterUserId) {
          context.reporter_role = "caller";
          context.reported_role = "callee";
        } else if (callHistory.callee_id === reporterUserId) {
          context.reporter_role = "callee";
          context.reported_role = "caller";
        }

        if (callHistory.ended_at) {
          const startedAt = new Date(callHistory.started_at);
          const endedAt = new Date(callHistory.ended_at);
          const reportedAt = new Date();
          const reportedAtOffset = Math.floor((reportedAt.getTime() - startedAt.getTime()) / 1000);
          if (reportedAtOffset >= 0 && reportedAtOffset <= (callHistory.duration_seconds || 0)) {
            context.reported_at_offset_seconds = reportedAtOffset;
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching call history:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  if (roomId) {
    try {
      const videoChatContext = getVideoChatContext();
      if (videoChatContext) {
        const room = videoChatContext.rooms.getRoom(roomId);
        if (room) {
          const now = new Date();
          const startedAt = room.startedAt;
          const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

          if (!context.call_started_at) {
            context.call_started_at = startedAt.toISOString();
          }
          context.duration_seconds = durationSeconds > 0 ? durationSeconds : 0;
          context.reported_at_offset_seconds = durationSeconds > 0 ? durationSeconds : null;

          const io: Namespace = videoChatContext.io;
          const user1Socket = io.sockets.get(room.user1);
          const user2Socket = io.sockets.get(room.user2);

          if (user1Socket && (user1Socket as any).data?.userId) {
            const user1ClerkId = (user1Socket as any).data.userId;
            const user1DbId = await getUserIdByClerkId(user1ClerkId);
            if (user1DbId === reporterUserId) {
              context.reporter_role = "caller";
              context.reported_role = "callee";
            } else if (user1DbId === reportedUserId) {
              context.reporter_role = "callee";
              context.reported_role = "caller";
            }
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching room context:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return context;
}
