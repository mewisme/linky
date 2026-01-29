import type { CollectReportContextParams, LiveVideoChatContext, ReportContextData } from "../types/report-context.types.js";
import { getCallHistoryById, getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";

import type { Json } from "../../../types/database/supabase.types.js";
import type { Namespace } from "socket.io";
import { createLogger } from "@repo/logger";

const logger = createLogger("api:reports:context:service");

export async function collectReportContext(
  params: CollectReportContextParams,
  deps: { getVideoChatContext: () => LiveVideoChatContext | null },
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
          const reportedAt = new Date();
          const reportedAtOffset = Math.floor((reportedAt.getTime() - startedAt.getTime()) / 1000);
          if (reportedAtOffset >= 0 && reportedAtOffset <= (callHistory.duration_seconds || 0)) {
            context.reported_at_offset_seconds = reportedAtOffset;
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching call history: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (roomId) {
    try {
      const videoChatContext = deps.getVideoChatContext();
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
      logger.error("Error fetching room context: %o", error instanceof Error ? error : new Error(String(error)));
    }
  }

  return context;
}

